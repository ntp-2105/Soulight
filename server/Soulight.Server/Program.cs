using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Soulight.Server;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<RoomRegistry>();

var app = builder.Build();
app.UseWebSockets();
app.MapGet("/health", (RoomRegistry rooms) => new { rooms = rooms.RoomCount });
app.Map("/ws", async (HttpContext context, RoomRegistry rooms) =>
{
    if (!context.WebSockets.IsWebSocketRequest)
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        return;
    }

    using var socket = await context.WebSockets.AcceptWebSocketAsync();
    await RunConnection(socket, rooms, context.RequestAborted);
});
app.Run();

static async Task RunConnection(WebSocket socket, RoomRegistry rooms, CancellationToken aborted)
{
    var client = new Client();
    var pump = PumpOutbox(socket, client, aborted);
    var buffer = new byte[Protocol.MaxMessageBytes];
    var closeStatus = WebSocketCloseStatus.NormalClosure;

    try
    {
        while (await Receive(socket, buffer, aborted) is { } text) rooms.Handle(client, text);
    }
    catch (InvalidDataException)
    {
        closeStatus = WebSocketCloseStatus.MessageTooBig;
    }
    catch (Exception e) when (e is WebSocketException or OperationCanceledException)
    {
    }
    finally
    {
        rooms.Leave(client);
        client.Outbox.Writer.TryComplete();
        await pump;
    }

    // Close only after the pump stops: a WebSocket allows one send at a time.
    if (socket.State is WebSocketState.Open or WebSocketState.CloseReceived)
    {
        try
        {
            await socket.CloseOutputAsync(closeStatus, null, aborted);
        }
        catch (Exception e) when (e is WebSocketException or OperationCanceledException)
        {
        }
    }
}

// Returns one whole text message, "" for a binary message, or null once the client closes.
static async Task<string?> Receive(WebSocket socket, byte[] buffer, CancellationToken aborted)
{
    var count = 0;
    while (true)
    {
        if (count == buffer.Length) throw new InvalidDataException("Message too big.");
        var result = await socket.ReceiveAsync(buffer.AsMemory(count), aborted);
        if (result.MessageType == WebSocketMessageType.Close) return null;
        count += result.Count;
        if (!result.EndOfMessage) continue;
        return result.MessageType == WebSocketMessageType.Text ? Encoding.UTF8.GetString(buffer, 0, count) : "";
    }
}

static async Task PumpOutbox(WebSocket socket, Client client, CancellationToken aborted)
{
    try
    {
        await foreach (var message in client.Outbox.Reader.ReadAllAsync(aborted))
        {
            var bytes = JsonSerializer.SerializeToUtf8Bytes(message, message.GetType(), Protocol.Json);
            await socket.SendAsync(bytes, WebSocketMessageType.Text, true, aborted);
        }
    }
    catch (Exception e) when (e is WebSocketException or OperationCanceledException)
    {
    }
}
