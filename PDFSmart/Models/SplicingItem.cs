namespace SmartPdfEditor.Models;

/// <summary>
/// Represents a single entry in a PDF splicing task.
/// </summary>
public class SplicingItem
{
    /// <summary>
    /// Path to the source PDF file.
    /// </summary>
    public string FilePath { get; set; } = string.Empty;

    /// <summary>
    /// The name of the file (for display).
    /// </summary>
    public string FileName => System.IO.Path.GetFileName(FilePath);

    /// <summary>
    /// Page selection string (e.g., "1, 3, 5-10" or "all").
    /// </summary>
    public string PageSelection { get; set; } = "all";

    /// <summary>
    /// Optional label for the slice.
    /// </summary>
    public string? Label { get; set; }
}
