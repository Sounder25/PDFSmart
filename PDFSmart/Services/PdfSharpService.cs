using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using PdfSharp.Pdf;
using PdfSharp.Pdf.IO;
using PdfSharp.Drawing;
using PdfSharp.Pdf.AcroForms;
using SmartPdfEditor.Models;
using System.Text;
using PdfiumViewer;
using Tesseract;

namespace SmartPdfEditor.Services;

/// <summary>
/// PdfSharp-based implementation for PDF manipulation.
/// </summary>
public class PdfSharpService : IPdfService
{
    public Task CombinePdfsAsync(IEnumerable<string> inputPaths, string outputPath)
    {
        return Task.Run(() =>
        {
            using PdfSharp.Pdf.PdfDocument outputDocument = new PdfSharp.Pdf.PdfDocument();

            foreach (string filePath in inputPaths)
            {
                if (!File.Exists(filePath))
                    throw new FileNotFoundException($"PDF file not found: {filePath}");

                using PdfSharp.Pdf.PdfDocument inputDocument = PdfReader.Open(filePath, PdfDocumentOpenMode.Import);
                for (int i = 0; i < inputDocument.PageCount; i++)
                {
                    outputDocument.AddPage(inputDocument.Pages[i]);
                }
            }

            outputDocument.Save(outputPath);
        });
    }

    public Task SplitPdfAsync(string inputPath, string outputDirectory)
    {
        return Task.Run(() =>
        {
            if (!File.Exists(inputPath))
                throw new FileNotFoundException($"PDF file not found: {inputPath}");

            if (!Directory.Exists(outputDirectory))
                Directory.CreateDirectory(outputDirectory);

            using PdfSharp.Pdf.PdfDocument inputDocument = PdfReader.Open(inputPath, PdfDocumentOpenMode.Import);
            string baseName = Path.GetFileNameWithoutExtension(inputPath);

            for (int i = 0; i < inputDocument.PageCount; i++)
            {
                using PdfSharp.Pdf.PdfDocument outputDocument = new PdfSharp.Pdf.PdfDocument();
                outputDocument.AddPage(inputDocument.Pages[i]);
                
                string outputPath = Path.Combine(outputDirectory, $"{baseName}_page_{i + 1}.pdf");
                outputDocument.Save(outputPath);
            }
        });
    }

    public Task RemovePagesAsync(string inputPath, string outputPath, IEnumerable<int> pageNumbersToRemove)
    {
        return Task.Run(() =>
        {
            if (!File.Exists(inputPath))
                throw new FileNotFoundException($"PDF file not found: {inputPath}");

            HashSet<int> pagesToRemove = new HashSet<int>(pageNumbersToRemove);

            using PdfSharp.Pdf.PdfDocument inputDocument = PdfReader.Open(inputPath, PdfDocumentOpenMode.Import);
            using PdfSharp.Pdf.PdfDocument outputDocument = new PdfSharp.Pdf.PdfDocument();

            for (int i = 0; i < inputDocument.PageCount; i++)
            {
                int pageNumber = i + 1; // 1-indexed
                if (!pagesToRemove.Contains(pageNumber))
                {
                    outputDocument.AddPage(inputDocument.Pages[i]);
                }
            }

            if (outputDocument.PageCount == 0)
                throw new InvalidOperationException("Cannot remove all pages from the PDF.");

            outputDocument.Save(outputPath);
        });
    }

    public Task ExtractPagesAsync(string inputPath, string outputPath, int startPage, int endPage)
    {
        return Task.Run(() =>
        {
            if (!File.Exists(inputPath))
                throw new FileNotFoundException($"PDF file not found: {inputPath}");

            if (startPage < 1 || endPage < startPage)
                throw new ArgumentException("Invalid page range specified.");

            using PdfSharp.Pdf.PdfDocument inputDocument = PdfReader.Open(inputPath, PdfDocumentOpenMode.Import);
            
            if (endPage > inputDocument.PageCount)
                throw new ArgumentException($"End page {endPage} exceeds document page count {inputDocument.PageCount}.");

            using PdfSharp.Pdf.PdfDocument outputDocument = new PdfSharp.Pdf.PdfDocument();

            for (int i = startPage - 1; i < endPage; i++)
            {
                outputDocument.AddPage(inputDocument.Pages[i]);
            }

            outputDocument.Save(outputPath);
        });
    }

    public Task<List<FormField>> GetFormFieldsAsync(string pdfPath)
    {
        return Task.Run(() =>
        {
            if (!File.Exists(pdfPath))
                throw new FileNotFoundException($"PDF file not found: {pdfPath}");

            List<FormField> fields = new List<FormField>();

            using PdfSharp.Pdf.PdfDocument document = PdfReader.Open(pdfPath, PdfDocumentOpenMode.Modify);
            
            if (document.AcroForm == null || document.AcroForm.Fields.Count == 0)
                return fields; // No forms in this PDF

            foreach (string fieldName in document.AcroForm.Fields.Names)
            {
                PdfAcroField field = (PdfAcroField)document.AcroForm.Fields[fieldName];
                if (field == null) continue;

                var formField = new FormField
                {
                    Name = field.Name ?? fieldName,
                    CurrentValue = field.Value?.ToString(),
                    IsReadOnly = field.ReadOnly
                };

                // Determine field type based on FT (Field Type) entry
                string? fieldType = field.Elements.GetName("/FT");

                formField.Type = fieldType switch
                {
                    "/Tx" => "Text",
                    "/Btn" => "CheckBox",
                    "/Ch" => "ComboBox",
                    _ => "Text" // Default to text
                };

                fields.Add(formField);
            }

            return fields;
        });
    }

    public Task FillFormAsync(string inputPath, string outputPath, Dictionary<string, string> fieldValues)
    {
        return Task.Run(() =>
        {
            if (!File.Exists(inputPath))
                throw new FileNotFoundException($"PDF file not found: {inputPath}");

            using PdfSharp.Pdf.PdfDocument document = PdfReader.Open(inputPath, PdfDocumentOpenMode.Modify);

            if (document.AcroForm == null)
                throw new InvalidOperationException("This PDF does not contain any forms.");

            // Ensure the form fields are rendered by the viewer
            document.AcroForm.Elements.SetBoolean("/NeedAppearances", true);

            foreach (var kvp in fieldValues)
            {
                PdfAcroField field = (PdfAcroField)document.AcroForm.Fields[kvp.Key];
                if (field != null)
                {
                    if (field is PdfTextField textField)
                    {
                        textField.Text = kvp.Value;
                    }
                    else
                    {
                        field.Value = new PdfSharp.Pdf.PdfString(kvp.Value);
                    }
                }
            }

            document.Save(outputPath);
        });
    }

    public Task AddTextAsync(string inputPath, string outputPath, TextAnnotation annotation)
    {
        return Task.Run(() =>
        {
            if (!File.Exists(inputPath))
                throw new FileNotFoundException($"PDF file not found: {inputPath}");

            if (annotation.PageNumber < 1)
                throw new ArgumentException("Page number must be 1 or greater.");

            using PdfSharp.Pdf.PdfDocument document = PdfReader.Open(inputPath, PdfDocumentOpenMode.Modify);

            if (annotation.PageNumber > document.PageCount)
                throw new ArgumentException($"Page number {annotation.PageNumber} exceeds document page count {document.PageCount}.");

            // Get the specified page (1-indexed)
            PdfPage page = document.Pages[annotation.PageNumber - 1];

            // Create graphics object for drawing
            using (XGraphics gfx = XGraphics.FromPdfPage(page))
            {
                // Parse color from hex
                XColor color = ParseHexColor(annotation.ColorHex);

                // Create font
                XFont font = new XFont(annotation.FontFamily, annotation.FontSize, XFontStyleEx.Regular);

                // Create brush with specified color
                XBrush brush = new XSolidBrush(color);

                // Draw the text
                // PdfSharp's XGraphics.FromPdfPage already uses top-left origin by default.
                // The previous manual conversion was likely pushing text to the bottom of the page.
                gfx.DrawString(annotation.Text, font, brush, annotation.X, annotation.Y);
            }

            document.Save(outputPath);
        });
    }

    /// <summary>
    /// Parses a hex color string (e.g., "#FF0000" or "FF0000") to XColor.
    /// </summary>
    private static XColor ParseHexColor(string hexColor)
    {
        // Remove # if present
        hexColor = hexColor.TrimStart('#');

        if (hexColor.Length == 6)
        {
            // RGB format
            byte r = Convert.ToByte(hexColor.Substring(0, 2), 16);
            byte g = Convert.ToByte(hexColor.Substring(2, 2), 16);
            byte b = Convert.ToByte(hexColor.Substring(4, 2), 16);
            return XColor.FromArgb(255, r, g, b);
        }
        else if (hexColor.Length == 8)
        {
            // ARGB format
            byte a = Convert.ToByte(hexColor.Substring(0, 2), 16);
            byte r = Convert.ToByte(hexColor.Substring(2, 2), 16);
            byte g = Convert.ToByte(hexColor.Substring(4, 2), 16);
            byte b = Convert.ToByte(hexColor.Substring(6, 2), 16);
            return XColor.FromArgb(a, r, g, b);
        }
        else
        {
            // Default to black if invalid format
            return XColors.Black;
        }
    }

    public Task<string> ExtractTextAsync(string pdfPath)
    {
        return Task.Run(() =>
        {
            if (!File.Exists(pdfPath))
                throw new FileNotFoundException($"PDF file not found: {pdfPath}");

            StringBuilder sb = new StringBuilder();
            try
            {
                using var document = PdfiumViewer.PdfDocument.Load(pdfPath);
                for (int i = 0; i < document.PageCount; i++)
                {
                    string pageText = document.GetPdfText(i);
                    sb.AppendLine(pageText);
                }
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Failed to extract text: {ex.Message}", ex);
            }

            return sb.ToString();
        });
    }

    public Task<List<TextPiece>> GetTextPiecesAsync(string pdfPath)
    {
        return Task.Run(() =>
        {
            if (!File.Exists(pdfPath))
                throw new FileNotFoundException($"PDF file not found: {pdfPath}");

            List<TextPiece> pieces = new List<TextPiece>();
            try
            {
                using var document = PdfiumViewer.PdfDocument.Load(pdfPath);
                for (int i = 0; i < document.PageCount; i++)
                {
                    string pageText = document.GetPdfText(i);
                    // Split by double newline to identify "pieces" or paragraphs
                    var blocks = pageText.Split(new[] { "\r\n\r\n", "\n\n" }, StringSplitOptions.RemoveEmptyEntries);
                    
                    for (int j = 0; j < blocks.Length; j++)
                    {
                        var block = blocks[j].Trim();
                        if (string.IsNullOrWhiteSpace(block)) continue;

                        pieces.Add(new TextPiece
                        {
                            Text = block,
                            PageNumber = i + 1,
                            PieceIndex = j,
                            Metadata = $"Page {i + 1}, Block {j + 1}"
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Failed to extract text pieces: {ex.Message}", ex);
            }

            return pieces;
        });
    }

    public Task ReplaceTextAsync(string inputPath, string outputPath, TextPiece original, string newText)
    {
        return Task.Run(() =>
        {
            if (!File.Exists(inputPath))
                throw new FileNotFoundException($"PDF file not found: {inputPath}");

            using PdfSharp.Pdf.PdfDocument document = PdfReader.Open(inputPath, PdfDocumentOpenMode.Modify);
            
            if (original.PageNumber < 1 || original.PageNumber > document.PageCount)
                throw new ArgumentException("Invalid page number in TextPiece.");

            PdfPage page = document.Pages[original.PageNumber - 1];

            using (XGraphics gfx = XGraphics.FromPdfPage(page))
            {
                // Mask the original text area if we have coordinates
                // For now, if Width/Height are 0, we assume a default area or just append
                if (original.Width > 0 && original.Height > 0)
                {
                    XBrush maskBrush = XBrushes.White;
                    gfx.DrawRectangle(maskBrush, original.X, original.Y, original.Width, original.Height);
                }

                XFont font = new XFont("Arial", 12, XFontStyleEx.Regular);
                XBrush brush = XBrushes.Black;

                // Draw the new text at the same coordinates
                gfx.DrawString(newText, font, brush, original.X, original.Y);
            }

            document.Save(outputPath);
        });
    }

    public Task PerformSplicingAsync(IEnumerable<SplicingItem> items, string outputPath)
    {
        return Task.Run(() =>
        {
            using PdfSharp.Pdf.PdfDocument outputDocument = new PdfSharp.Pdf.PdfDocument();

            foreach (var item in items)
            {
                if (!File.Exists(item.FilePath))
                    throw new FileNotFoundException($"PDF file not found: {item.FilePath}");

                using PdfSharp.Pdf.PdfDocument inputDocument = PdfReader.Open(item.FilePath, PdfDocumentOpenMode.Import);
                
                List<int> pagesToInclude = ParsePageSelection(item.PageSelection, inputDocument.PageCount);

                foreach (int pageNumber in pagesToInclude)
                {
                    // pageNumber is 1-indexed from parser, PdfSharp pages are 0-indexed
                    if (pageNumber >= 1 && pageNumber <= inputDocument.PageCount)
                    {
                        outputDocument.AddPage(inputDocument.Pages[pageNumber - 1]);
                    }
                }
            }

            if (outputDocument.PageCount == 0)
                throw new InvalidOperationException("No pages were selected for splicing.");

            outputDocument.Save(outputPath);
        });
    }

    private static List<int> ParsePageSelection(string selection, int totalPages)
    {
        List<int> result = new List<int>();

        if (string.IsNullOrWhiteSpace(selection) || selection.ToLower() == "all")
        {
            for (int i = 1; i <= totalPages; i++) result.Add(i);
            return result;
        }

        var parts = selection.Split(',', StringSplitOptions.RemoveEmptyEntries);
        foreach (var part in parts)
        {
            var trimmed = part.Trim();
            if (trimmed.Contains('-'))
            {
                var range = trimmed.Split('-');
                if (range.Length == 2 && 
                    int.TryParse(range[0].Trim(), out int start) && 
                    int.TryParse(range[1].Trim(), out int end))
                {
                    for (int i = Math.Max(1, start); i <= Math.Min(totalPages, end); i++)
                    {
                        result.Add(i);
                    }
                }
            }
            else if (int.TryParse(trimmed, out int page))
            {
                if (page >= 1 && page <= totalPages)
                {
                    result.Add(page);
                }
            }
        }

        return result;
    }

    public Task RotatePagesAsync(string inputPath, string outputPath, IEnumerable<int> pageNumbers, int degrees)
    {
        return Task.Run(() =>
        {
            if (!File.Exists(inputPath))
                throw new FileNotFoundException($"PDF file not found: {inputPath}");

            if (degrees != 90 && degrees != 180 && degrees != 270)
                throw new ArgumentException("Degrees must be 90, 180, or 270.");

            var pagesToRotate = new HashSet<int>(pageNumbers);

            using PdfSharp.Pdf.PdfDocument document = PdfReader.Open(inputPath, PdfDocumentOpenMode.Modify);

            foreach (int pageNum in pagesToRotate)
            {
                if (pageNum >= 1 && pageNum <= document.PageCount)
                {
                    PdfPage page = document.Pages[pageNum - 1];
                    page.Rotate = (page.Rotate + degrees) % 360;
                }
            }

            document.Save(outputPath);
        });
    }

    public Task<int> GetPageCountAsync(string pdfPath)
    {
        return Task.Run(() =>
        {
            if (!File.Exists(pdfPath))
                throw new FileNotFoundException($"PDF file not found: {pdfPath}");

            using var document = PdfiumViewer.PdfDocument.Load(pdfPath);
            return document.PageCount;
        });
    }

    public Task<System.Windows.Size> GetPageSizeAsync(string pdfPath, int pageIndex)
    {
        return Task.Run(() =>
        {
            if (!File.Exists(pdfPath))
                throw new FileNotFoundException($"PDF file not found: {pdfPath}");

            using var document = PdfiumViewer.PdfDocument.Load(pdfPath);
            if (pageIndex < 0 || pageIndex >= document.PageCount)
                throw new ArgumentException($"Page index {pageIndex} is out of range.");

            var size = document.PageSizes[pageIndex];
            return new System.Windows.Size(size.Width, size.Height);
        });
    }

    public Task<System.Windows.Media.Imaging.BitmapSource> RenderPageThumbnailAsync(string pdfPath, int pageIndex, int width = 200, int height = 280)
    {
        return Task.Run(() =>
        {
            if (!File.Exists(pdfPath))
                throw new FileNotFoundException($"PDF file not found: {pdfPath}");

            using var document = PdfiumViewer.PdfDocument.Load(pdfPath);
            if (pageIndex < 0 || pageIndex >= document.PageCount)
                throw new ArgumentException($"Page index {pageIndex} is out of range for document with {document.PageCount} pages.");

            // Render page to a System.Drawing.Image
            using var image = document.Render(pageIndex, width, height, 96, 96, false);
            using var bitmap = new System.Drawing.Bitmap(image);

            // Convert System.Drawing.Bitmap to WPF BitmapSource
            var bitmapData = bitmap.LockBits(
                new System.Drawing.Rectangle(0, 0, bitmap.Width, bitmap.Height),
                System.Drawing.Imaging.ImageLockMode.ReadOnly,
                System.Drawing.Imaging.PixelFormat.Format32bppArgb);

            var bitmapSource = System.Windows.Media.Imaging.BitmapSource.Create(
                bitmapData.Width,
                bitmapData.Height,
                96, 96,
                System.Windows.Media.PixelFormats.Bgra32,
                null,
                bitmapData.Scan0,
                bitmapData.Stride * bitmapData.Height,
                bitmapData.Stride);

            bitmap.UnlockBits(bitmapData);

            // Freeze for cross-thread access
            bitmapSource.Freeze();
            return bitmapSource;
        });
    }

    public Task ExportPagesToImagesAsync(string pdfPath, string outputDirectory, int dpi = 300, string imageFormat = "png")
    {
        return Task.Run(() =>
        {
            if (!File.Exists(pdfPath))
                throw new FileNotFoundException($"PDF file not found: {pdfPath}");

            if (!Directory.Exists(outputDirectory))
                Directory.CreateDirectory(outputDirectory);

            if (dpi <= 0)
                throw new ArgumentOutOfRangeException(nameof(dpi), "DPI must be greater than zero.");

            string extension = imageFormat.Trim().ToLowerInvariant();
            var imageFormatObj = extension switch
            {
                "jpg" or "jpeg" => System.Drawing.Imaging.ImageFormat.Jpeg,
                "bmp" => System.Drawing.Imaging.ImageFormat.Bmp,
                "tif" or "tiff" => System.Drawing.Imaging.ImageFormat.Tiff,
                "png" => System.Drawing.Imaging.ImageFormat.Png,
                _ => System.Drawing.Imaging.ImageFormat.Png
            };

            using var document = PdfiumViewer.PdfDocument.Load(pdfPath);
            string baseName = Path.GetFileNameWithoutExtension(pdfPath);

            for (int i = 0; i < document.PageCount; i++)
            {
                var pageSize = document.PageSizes[i];
                int widthPx = (int)Math.Round(pageSize.Width / 72f * dpi);
                int heightPx = (int)Math.Round(pageSize.Height / 72f * dpi);

                using var image = document.Render(i, widthPx, heightPx, dpi, dpi, false);
                string fileName = $"{baseName}_page_{i + 1}.{extension}";
                string outputPath = Path.Combine(outputDirectory, fileName);
                image.Save(outputPath, imageFormatObj);
            }
        });
    }

    public Task MakeSearchablePdfAsync(string inputPath, string outputPath, string language = "eng", int dpi = 300)
    {
        return Task.Run(() =>
        {
            if (!File.Exists(inputPath))
                throw new FileNotFoundException($"PDF file not found: {inputPath}");

            if (dpi <= 0)
                throw new ArgumentOutOfRangeException(nameof(dpi), "DPI must be greater than zero.");

            string baseDirectory = AppContext.BaseDirectory;
            if (string.IsNullOrWhiteSpace(baseDirectory))
                baseDirectory = Environment.CurrentDirectory;

            TesseractEnviornment.CustomSearchPath = baseDirectory;

            string tessDataPath = Path.Combine(baseDirectory, "tessdata");
            if (!Directory.Exists(tessDataPath))
                throw new InvalidOperationException("OCR data not found. Create a tessdata folder next to the app and add language files (e.g., eng.traineddata).");

            using var engine = new TesseractEngine(tessDataPath, language, EngineMode.Default);
            using var sourceDocument = PdfiumViewer.PdfDocument.Load(inputPath);
            using var outputDocument = new PdfSharp.Pdf.PdfDocument();

            for (int i = 0; i < sourceDocument.PageCount; i++)
            {
                var pageSize = sourceDocument.PageSizes[i];
                int widthPx = (int)Math.Round(pageSize.Width / 72f * dpi);
                int heightPx = (int)Math.Round(pageSize.Height / 72f * dpi);

                using var image = sourceDocument.Render(i, widthPx, heightPx, dpi, dpi, false);
                using var bitmap = new System.Drawing.Bitmap(image);
                byte[] imageBytes;
                using (var ms = new MemoryStream())
                {
                    bitmap.Save(ms, System.Drawing.Imaging.ImageFormat.Png);
                    imageBytes = ms.ToArray();
                }

                using var pix = Pix.LoadFromMemory(imageBytes);
                using var result = engine.Process(pix);
                using var iterator = result.GetIterator();

                PdfPage page = outputDocument.AddPage();
                page.Width = pageSize.Width;
                page.Height = pageSize.Height;

                using var gfx = XGraphics.FromPdfPage(page);

                // Draw text FIRST — white opaque brush, no transparency group.
                // The image is drawn on top so the text is visually hidden, but the
                // text operators live in the main content stream and are found by search.
                if (iterator != null)
                {
                    iterator.Begin();
                    var whiteBrush = new XSolidBrush(XColors.White);

                    do
                    {
                        if (!iterator.TryGetBoundingBox(PageIteratorLevel.Word, out var rect))
                            continue;

                        string? wordText = iterator.GetText(PageIteratorLevel.Word);
                        if (string.IsNullOrWhiteSpace(wordText))
                            continue;

                        double x = rect.X1 / (double)dpi * 72d;
                        double y = rect.Y1 / (double)dpi * 72d;
                        double height = Math.Max(4, (rect.Y2 - rect.Y1) / (double)dpi * 72d);

                        var font = new XFont("Arial", height, XFontStyleEx.Regular);
                        gfx.DrawString(wordText, font, whiteBrush, x, y, XStringFormats.TopLeft);
                    }
                    while (iterator.Next(PageIteratorLevel.Word));
                }

                // Draw image ON TOP — covers the white text so the page looks like a normal scan.
                using (var imageStream = new MemoryStream(imageBytes))
                using (var xImage = XImage.FromStream(imageStream))
                {
                    gfx.DrawImage(xImage, 0, 0, page.Width, page.Height);
                }
            }

            outputDocument.Save(outputPath);
        });
    }

    public Task CreateOcrSamplePdfAsync(string outputPath)
    {
        return Task.Run(() =>
        {
            int width = 1654;
            int height = 2339;

            using var bitmap = new System.Drawing.Bitmap(width, height);
            using (var graphics = System.Drawing.Graphics.FromImage(bitmap))
            {
                graphics.Clear(System.Drawing.Color.White);
                graphics.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
                graphics.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;

                using var headerFont = new System.Drawing.Font("Georgia", 42, System.Drawing.FontStyle.Bold);
                using var bodyFont = new System.Drawing.Font("Calibri", 22, System.Drawing.FontStyle.Regular);
                using var monoFont = new System.Drawing.Font("Consolas", 20, System.Drawing.FontStyle.Regular);
                using var brush = new System.Drawing.SolidBrush(System.Drawing.Color.FromArgb(30, 35, 40));

                graphics.DrawString("PDFSmart OCR Sample", headerFont, brush, new System.Drawing.PointF(120, 140));
                graphics.DrawString("This page is an image. OCR should detect this text.", bodyFont, brush, new System.Drawing.PointF(120, 260));
                graphics.DrawString("Quick test lines:", bodyFont, brush, new System.Drawing.PointF(120, 340));

                graphics.DrawString("1) The quick brown fox jumps over the lazy dog.", bodyFont, brush, new System.Drawing.PointF(140, 420));
                graphics.DrawString("2) Numbers: 1234567890", bodyFont, brush, new System.Drawing.PointF(140, 480));
                graphics.DrawString("3) Dates: 03/29/2026", bodyFont, brush, new System.Drawing.PointF(140, 540));
                graphics.DrawString("4) Mixed: PDFSmart-ocr_test@v1", monoFont, brush, new System.Drawing.PointF(140, 600));

                graphics.DrawString("Paragraph sample:", bodyFont, brush, new System.Drawing.PointF(120, 700));
                graphics.DrawString(
                    "OCR should make this text searchable in the resulting PDF. " +
                    "If you can select and search for words after running OCR, it worked.",
                    bodyFont,
                    brush,
                    new System.Drawing.RectangleF(120, 760, 1350, 240));

                using var linePen = new System.Drawing.Pen(System.Drawing.Color.FromArgb(210, 215, 220), 2);
                graphics.DrawLine(linePen, 120, 1040, 1530, 1040);
                graphics.DrawString("Signature: __________________________", bodyFont, brush, new System.Drawing.PointF(120, 1080));
                graphics.DrawString("Amount: $1,250.00", bodyFont, brush, new System.Drawing.PointF(120, 1140));
            }

            using var document = new PdfSharp.Pdf.PdfDocument();
            var page = document.AddPage();
            page.Width = XUnit.FromPoint(595);
            page.Height = XUnit.FromPoint(842);

            using var gfx = XGraphics.FromPdfPage(page);
            using var imageStream = new MemoryStream();
            bitmap.Save(imageStream, System.Drawing.Imaging.ImageFormat.Png);
            imageStream.Position = 0;
            using var xImage = XImage.FromStream(imageStream);

            gfx.DrawImage(xImage, 0, 0, page.Width, page.Height);
            document.Save(outputPath);
        });
    }
}
