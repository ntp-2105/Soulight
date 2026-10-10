using System.Security.Cryptography;
using System.Text.Json;
using System.Threading.Channels;

namespace Soulight.Server;

public sealed record PlayerInput(
    int Sequence,
    int ClientTick,
    float MoveX,
    float MoveY,
    float AimX,
    float AimY,
    bool Fire,
    bool Ability,
    bool Interact);

public sealed record ClientMessage(string? Type, string? RoomId, PlayerInput? Input);

public sealed record PlayerView(Guid Id, float X, float Y);

public sealed record RoomJoined(string RoomId, Guid PlayerId, IReadOnlyList<PlayerView> Players)
{
    public string Type => "ROOM_JOINED";
}

public sealed record EntitySpawn(PlayerView Player)
{
    public string Type => "ENTITY_SPAWN";
}

public sealed record EntityDespawn(Guid Id)
{
    public string Type => "ENTITY_DESPAWN";
}

public sealed record ErrorMessage(string Reason)
{
    public string Type => "ERROR";
}

public static class Protocol
{
    public const int MaxMessageBytes = 4096;
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
}

/// <summary>One WebSocket connection; it is at most one player in one room.</summary>
public sealed class Client
{
    public Guid Id { get; } = Guid.NewGuid();

    // ponytail: unbounded outbox; bound it once M3 streams snapshots and slow clients matter.
    public Channel<object> Outbox { get; } = Channel.CreateUnbounded<object>(new() { SingleReader = true });

    public int LastSequence { get; internal set; }
    public PlayerInput? LastInput { get; internal set; }

    internal Room? Room;
    internal int Slot;

    internal void Send(object message) => Outbox.Writer.TryWrite(message);
}

internal sealed class Room(string id)
{
    public string Id { get; } = id;
    public List<Client> Players { get; } = [];
}

public sealed class RoomRegistry
{
    public const int MaxPlayers = 4;

    // Matches the M1 arena: four points around the centre of a 1280x720 room.
    private static readonly (float X, float Y)[] Spawns = [(580, 320), (700, 320), (580, 400), (700, 400)];
    private const string RoomIdAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    // ponytail: one lock for every room; per-room locks when M3 adds tick loops.
    private readonly Lock gate = new();
    private readonly Dictionary<string, Room> rooms = [];

    public int RoomCount
    {
        get { lock (gate) return rooms.Count; }
    }

    public void Handle(Client client, string text)
    {
        ClientMessage? message;
        try
        {
            message = JsonSerializer.Deserialize<ClientMessage>(text, Protocol.Json);
        }
        catch (JsonException)
        {
            message = null;
        }

        switch (message?.Type)
        {
            case "JOIN_ROOM":
                Join(client, message.RoomId);
                break;
            case "PLAYER_INPUT" when message.Input is not null:
                Input(client, message.Input);
                break;
            case "LEAVE_ROOM":
                Leave(client);
                break;
            default:
                client.Send(new ErrorMessage("bad_message"));
                break;
        }
    }

    public void Leave(Client client)
    {
        lock (gate)
        {
            var room = client.Room;
            if (room is null) return;

            room.Players.Remove(client);
            client.Room = null;
            client.LastSequence = 0;
            client.LastInput = null;
            if (room.Players.Count == 0) rooms.Remove(room.Id);
            foreach (var other in room.Players) other.Send(new EntityDespawn(client.Id));
        }
    }

    private void Join(Client client, string? roomId)
    {
        lock (gate)
        {
            if (client.Room is not null)
            {
                client.Send(new ErrorMessage("already_in_room"));
                return;
            }

            Room? room;
            if (roomId is null)
            {
                room = new Room(NewRoomId());
                rooms.Add(room.Id, room);
            }
            else if (!rooms.TryGetValue(roomId.ToUpperInvariant(), out room))
            {
                client.Send(new ErrorMessage("room_not_found"));
                return;
            }

            if (room.Players.Count >= MaxPlayers)
            {
                client.Send(new ErrorMessage("room_full"));
                return;
            }

            client.Slot = Enumerable.Range(0, MaxPlayers).First(slot => room.Players.All(p => p.Slot != slot));
            client.Room = room;
            foreach (var other in room.Players) other.Send(new EntitySpawn(View(client)));
            room.Players.Add(client);
            client.Send(new RoomJoined(room.Id, client.Id, room.Players.Select(View).ToList()));
        }
    }

    private void Input(Client client, PlayerInput input)
    {
        if (!float.IsFinite(input.MoveX) || !float.IsFinite(input.MoveY)
            || !float.IsFinite(input.AimX) || !float.IsFinite(input.AimY))
        {
            client.Send(new ErrorMessage("bad_input"));
            return;
        }

        // Clients are untrusted: never accept a move vector longer than 1.
        var length = MathF.Sqrt(input.MoveX * input.MoveX + input.MoveY * input.MoveY);
        if (length > 1) input = input with { MoveX = input.MoveX / length, MoveY = input.MoveY / length };

        lock (gate)
        {
            // Drop inputs before joining, and stale or replayed sequence numbers.
            if (client.Room is null || input.Sequence <= client.LastSequence) return;
            client.LastSequence = input.Sequence;
            client.LastInput = input;
        }
    }

    private string NewRoomId()
    {
        string id;
        do id = RandomNumberGenerator.GetString(RoomIdAlphabet, 5);
        while (rooms.ContainsKey(id));
        return id;
    }

    private static PlayerView View(Client client) => new(client.Id, Spawns[client.Slot].X, Spawns[client.Slot].Y);
}
