using System.Collections.Generic;
using System.Threading.Tasks;

namespace SmartPdfEditor.Services;

/// <summary>
/// Interface for PDF manipulation operations.
/// </summary>
public interface IPdfService
{
    Task CombinePdfsAsync(IEnumerable<string> inputPaths, string outputPath);
    Task SplitPdfAsync(string inputPath, string outputDirectory);
    Task RemovePagesAsync(string inputPath, string outputPath, IEnumerable<int> pageNumbersToRemove);
    Task ExtractPagesAsync(string inputPath, string outputPath, int startPage, int endPage);
    Task<List<SmartPdfEditor.Models.FormField>> GetFormFieldsAsync(string pdfPath);
    Task FillFormAsync(string inputPath, string outputPath, Dictionary<string, string> fieldValues);
    Task AddTextAsync(string inputPath, string outputPath, SmartPdfEditor.Models.TextAnnotation annotation);
    Task<string> ExtractTextAsync(string pdfPath);
    Task<List<SmartPdfEditor.Models.TextPiece>> GetTextPiecesAsync(string pdfPath);
    Task ReplaceTextAsync(string inputPath, string outputPath, SmartPdfEditor.Models.TextPiece original, string newText);
    Task PerformSplicingAsync(IEnumerable<SmartPdfEditor.Models.SplicingItem> items, string outputPath);

    /// <summary>
    /// Rotates specified pages by the given degrees (90, 180, 270).
    /// </summary>
    Task RotatePagesAsync(string inputPath, string outputPath, IEnumerable<int> pageNumbers, int degrees);

    Task<int> GetPageCountAsync(string pdfPath);
    Task<System.Windows.Size> GetPageSizeAsync(string pdfPath, int pageIndex);
    Task<System.Windows.Media.Imaging.BitmapSource> RenderPageThumbnailAsync(string pdfPath, int pageIndex, int width = 200, int height = 280);
    Task ExportPagesToImagesAsync(string pdfPath, string outputDirectory, int dpi = 300, string imageFormat = "png");
    Task MakeSearchablePdfAsync(string inputPath, string outputPath, string language = "eng", int dpi = 300);
    Task CreateOcrSamplePdfAsync(string outputPath);
}
