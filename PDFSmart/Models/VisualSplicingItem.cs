namespace SmartPdfEditor.Models;

using System.Windows.Media.Imaging;

/// <summary>
/// Represents a single page from a PDF file as a visual thumbnail in the workspace.
/// </summary>
public class VisualSplicingItem
{
    /// <summary>
    /// Path to the source PDF file.
    /// </summary>
    public string SourcePath { get; set; } = string.Empty;

    /// <summary>
    /// The 0-based index of the page in the source PDF.
    /// </summary>
    public int PageIndex { get; set; }

    /// <summary>
    /// The rendered thumbnail of the page.
    /// </summary>
    public BitmapSource? Thumbnail { get; set; }

    /// <summary>
    /// Helper property to display the file name.
    /// </summary>
    public string FileName => System.IO.Path.GetFileName(SourcePath);

    /// <summary>
    /// Helper property to display the 1-based page number.
    /// </summary>
    public int PageNumber => PageIndex + 1;
}
