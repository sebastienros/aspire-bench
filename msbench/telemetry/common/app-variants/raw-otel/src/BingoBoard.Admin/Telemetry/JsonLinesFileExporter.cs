using System.Diagnostics;
using System.Text.Json;
using OpenTelemetry;

namespace BingoBoard.Admin.Telemetry;

/// <summary>
/// Writes each finished span as one JSON line to a file.
/// </summary>
public sealed class JsonLinesFileExporter(string path) : BaseExporter<Activity>
{
    private readonly StreamWriter _writer = CreateWriter(path);

    private static StreamWriter CreateWriter(string path)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        return new StreamWriter(new FileStream(path, FileMode.Append, FileAccess.Write, FileShare.ReadWrite)) { AutoFlush = false };
    }

    public override ExportResult Export(in Batch<Activity> batch)
    {
        foreach (var activity in batch)
        {
            var attributes = new Dictionary<string, object?>();
            foreach (var tag in activity.TagObjects)
            {
                attributes[tag.Key] = tag.Value?.ToString();
            }
            _writer.WriteLine(JsonSerializer.Serialize(new
            {
                time = activity.StartTimeUtc.ToString("O"),
                traceId = activity.TraceId.ToString(),
                spanId = activity.SpanId.ToString(),
                parentSpanId = activity.ParentSpanId == default ? null : activity.ParentSpanId.ToString(),
                name = activity.DisplayName,
                kind = activity.Kind.ToString(),
                durationMs = Math.Round(activity.Duration.TotalMilliseconds, 1),
                status = activity.Status.ToString(),
                source = activity.Source.Name,
                attributes,
            }));
        }
        _writer.Flush();
        return ExportResult.Success;
    }

    protected override bool OnShutdown(int timeoutMilliseconds)
    {
        _writer.Dispose();
        return true;
    }
}
