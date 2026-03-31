using System.Collections.Generic;
using System.Threading.Tasks;

namespace SmartPdfEditor.Services;

/// <summary>
/// Interface for PDF manipulation operations.
/// </summary>
public interface IPdfService
{
    /// <summary>
    /// Combines multiple PDF files into a single output file.
    /// </summary>
    Task CombinePdfsAsync(IEnumerable<string> inputPaths, string outputPath);

    /// <summary>
    /// Splits a PDF into individual pages, saved as separate files.
    /// </summary>
    Task SplitPdfAsync(string inputPath, string outputDirectory);

    /// <summary>
    /// Removes specified pages from a PDF.
    /// </summary>
    Task RemovePagesAsync(string inputPath, string outputPath, IEnumerable<int> pageNumbersToRemove);

    /// <summary>
    /// Extracts a range of pages from a PDF into a new file.
    /// </summary>
    Task ExtractPagesAsync(string inputPath, string outputPath, int startPage, int endPage);

    /// <summary>
    /// Gets all form fields from a PDF.
    /// </summary>
    Task<List<SmartPdfEditor.Models.FormField>> GetFormFieldsAsync(string pdfPath);

    /// <summary>
    /// Fills form fields in a PDF and saves to output path.
    /// </summary>
    Task FillFormAsync(string inputPath, string outputPath, Dictionary<string, string> fieldValues);

    /// <summary>
    /// Adds text to a PDF at specified coordinates with formatting.
    /// </summary>
    Task AddTextAsync(string inputPath, string outputPath, SmartPdfEditor.Models.TextAnnotation annotation);

    /// <summary>
    /// Extracts all text from a PDF.
    /// </summary>
    Task<string> ExtractTextAsync(string pdfPath);

    /// <summary>
    /// Extracts text from a PDF as individual pieces (blocks).
    /// </summary>
    Task<List<SmartPdfEditor.Models.TextPiece>> GetTextPiecesAsync(string pdfPath);

    /// <summary>
    /// Replaces a piece of text by masking it and writing new text over it.
    /// </summary>
    Task ReplaceTextAsync(string inputPath, string outputPath, SmartPdfEditor.Models.TextPiece original, string newText);

    /// <summary>
    /// Performs a complex splicing operation based on multiple input items.
    /// </summary>
    Task PerformSplicingAsync(IEnumerable<SmartPdfEditor.Models.SplicingItem> items, string outputPath);

    /// <summary>
    /// Gets the number of pages in a PDF.
    /// </summary>
    Task<int> GetPageCountAsync(string pdfPath);

    /// <summary>
    /// Renders a single page of a PDF as a BitmapSource thumbnail.
    /// </summary>
    Task<System.Windows.Media.Imaging.BitmapSource> RenderPageThumbnailAsync(string pdfPath, int pageIndex, int width = 200, int height = 280);

    /// <summary>
    /// Retrieves the precise dimensions in points of a specific PDF page.
    /// </summary>
    Task<System.Windows.Size> GetPageSizeAsync(string pdfPath, int pageIndex);

    /// <summary>
    /// Exports each PDF page to an image file.
    /// </summary>
    Task ExportPagesToImagesAsync(string pdfPath, string outputDirectory, int dpi = 300, string imageFormat = "png");

    /// <summary>
    /// Runs OCR and produces a searchable PDF.
    /// </summary>
    Task MakeSearchablePdfAsync(string inputPath, string outputPath, string language = "eng", int dpi = 300);

    /// <summary>
    /// Creates a sample image-based PDF for OCR testing.
    /// </summary>
    Task CreateOcrSamplePdfAsync(string outputPath);
}
