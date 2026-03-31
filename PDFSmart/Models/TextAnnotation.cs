namespace SmartPdfEditor.Models;

/// <summary>
/// Represents text to be added to a PDF document.
/// </summary>
public class TextAnnotation
{
    /// <summary>
    /// The text content to add.
    /// </summary>
    public string Text { get; set; } = string.Empty;

    /// <summary>
    /// The page number (1-indexed) where text will be added.
    /// </summary>
    public int PageNumber { get; set; } = 1;

    /// <summary>
    /// X coordinate in points (1/72 inch) from left edge.
    /// </summary>
    public double X { get; set; }

    /// <summary>
    /// Y coordinate in points (1/72 inch) from top edge.
    /// </summary>
    public double Y { get; set; }

    /// <summary>
    /// Font family name (e.g., "Arial", "Times New Roman").
    /// </summary>
    public string FontFamily { get; set; } = "Arial";

    /// <summary>
    /// Font size in points.
    /// </summary>
    public double FontSize { get; set; } = 12;

    /// <summary>
    /// Color in hex format (e.g., "#000000" for black).
    /// </summary>
    public string ColorHex { get; set; } = "#000000";
}
