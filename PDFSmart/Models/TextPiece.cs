namespace SmartPdfEditor.Models;

/// <summary>
/// Represents a granular piece of text extracted from a PDF.
/// </summary>
public class TextPiece
{
    /// <summary>
    /// The actual text content.
    /// </summary>
    public string Text { get; set; } = string.Empty;

    /// <summary>
    /// The page number where this text was found (1-indexed).
    /// </summary>
    public int PageNumber { get; set; }

    /// <summary>
    /// An identifier for the piece (index on page).
    /// </summary>
    public int PieceIndex { get; set; }

    /// <summary>
    /// Optional: Information about the location or font if available.
    /// </summary>
    public string? Metadata { get; set; }

    public double X { get; set; }
    public double Y { get; set; }
    public double Width { get; set; }
    public double Height { get; set; }
}
