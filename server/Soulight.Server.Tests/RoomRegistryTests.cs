using Soulight.Server;

namespace Soulight.Server.Tests;

public class RoomRegistryTests
{
    private static List<object> Drain(Client client)
    {
        var messages = new List<object>();
        while (client.Outbox.Reader.TryRead(out var message)) messages.Add(message);
        return messages;
    }

    private static string Input(int sequence, int moveX, int moveY) =>
        $$$"""{"type":"PLAYER_INPUT","input":{"sequence":{{{sequence}}},"clientTick":1,"moveX":{{{moveX}}},"moveY":{{{moveY}}},"aimX":1,"aimY":0,"fire":false,"ability":false,"interact":false}}""";

    [Fact]
    public void CreatesJoinsFillsAndEmptiesARoom()
    {
        var rooms = new RoomRegistry();
        var host = new Client();
        rooms.Handle(host, """{"type":"JOIN_ROOM"}""");
        var created = Assert.IsType<RoomJoined>(Assert.Single(Drain(host)));
        Assert.Equal(host.Id, created.PlayerId);
        Assert.Single(created.Players);

        var guests = Enumerable.Range(0, 3).Select(_ => new Client()).ToList();
        foreach (var guest in guests) rooms.Handle(guest, $$"""{"type":"JOIN_ROOM","roomId":"{{created.RoomId.ToLowerInvariant()}}"}""");
        var lastJoined = Assert.IsType<RoomJoined>(Assert.Single(Drain(guests[2])));
        Assert.Equal(4, lastJoined.Players.Count);
        Assert.Equal(4, lastJoined.Players.Select(p => (p.X, p.Y)).Distinct().Count());
        Assert.Equal(3, Drain(host).OfType<EntitySpawn>().Count());

        var fifth = new Client();
        rooms.Handle(fifth, $$"""{"type":"JOIN_ROOM","roomId":"{{created.RoomId}}"}""");
        Assert.Equal("room_full", Assert.IsType<ErrorMessage>(Assert.Single(Drain(fifth))).Reason);

        rooms.Leave(guests[0]);
        Assert.Equal(guests[0].Id, Assert.IsType<EntityDespawn>(Assert.Single(Drain(host))).Id);

        // The freed spawn slot is reused.
        rooms.Handle(fifth, $$"""{"type":"JOIN_ROOM","roomId":"{{created.RoomId}}"}""");
        Assert.Equal(4, Assert.IsType<RoomJoined>(Assert.Single(Drain(fifth))).Players.Select(p => (p.X, p.Y)).Distinct().Count());

        foreach (var client in new[] { host, guests[1], guests[2], fifth }) rooms.Leave(client);
        Assert.Equal(0, rooms.RoomCount);

        var late = new Client();
        rooms.Handle(late, $$"""{"type":"JOIN_ROOM","roomId":"{{created.RoomId}}"}""");
        Assert.Equal("room_not_found", Assert.IsType<ErrorMessage>(Assert.Single(Drain(late))).Reason);
    }

    [Fact]
    public void AcceptsOnlyNewerInputsAndClampsMovement()
    {
        var rooms = new RoomRegistry();
        var client = new Client();

        rooms.Handle(client, Input(1, 1, 0));
        Assert.Null(client.LastInput);

        rooms.Handle(client, """{"type":"JOIN_ROOM"}""");
        rooms.Handle(client, Input(5, 3, 4));
        Assert.Equal(5, client.LastSequence);
        Assert.Equal(0.6f, client.LastInput!.MoveX, 0.0001f);
        Assert.Equal(0.8f, client.LastInput.MoveY, 0.0001f);

        rooms.Handle(client, Input(5, -1, 0));
        rooms.Handle(client, Input(4, -1, 0));
        Assert.Equal(0.6f, client.LastInput.MoveX, 0.0001f);

        Drain(client);
        rooms.Handle(client, "not json");
        rooms.Handle(client, """{"type":"TELEPORT","x":999}""");
        Assert.All(Drain(client), message => Assert.Equal("bad_message", Assert.IsType<ErrorMessage>(message).Reason));
    }
}
