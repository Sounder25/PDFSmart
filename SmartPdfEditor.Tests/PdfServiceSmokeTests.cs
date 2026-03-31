using NUnit.Framework;
using SmartPdfEditor.Services;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using PdfSharp.Pdf;
using PdfSharp.Pdf.IO;
using PdfSharp.Pdf.AcroForms;

namespace SmartPdfEditor.Tests;

[TestFixture]
public class PdfServiceSmokeTests
{
    private IPdfService _pdfService = null!;
    private string _testOutputDir = null!;
    private string _samplePdf1 = null!;
    private string _samplePdf2 = null!;
    private string _samplePdf3 = null!;

    [SetUp]
    public void Setup()
    {
        _pdfService = new PdfSharpService();
        _testOutputDir = Path.Combine(Path.GetTempPath(), "SmartPdfEditorTests_" + Guid.NewGuid().ToString());
        Directory.CreateDirectory(_testOutputDir);

        // Create sample PDFs for testing
        _samplePdf1 = Path.Combine(_testOutputDir, "sample1.pdf");
        _samplePdf2 = Path.Combine(_testOutputDir, "sample2.pdf");
        _samplePdf3 = Path.Combine(_testOutputDir, "sample3.pdf");
        
        CreateSamplePdf(_samplePdf1, 3); // 3 pages
        CreateSamplePdf(_samplePdf2, 2); // 2 pages
        CreateSamplePdf(_samplePdf3, 5); // 5 pages
    }

    [TearDown]
    public void Cleanup()
    {
        if (Directory.Exists(_testOutputDir))
        {
            try
            {
                Directory.Delete(_testOutputDir, true);
            }
            catch
            {
                // Best effort cleanup
            }
        }
    }
    private static void CreateSamplePdf(string path, int pageCount)
    {
        using PdfSharp.Pdf.PdfDocument document = new PdfSharp.Pdf.PdfDocument();
        for (int i = 0; i < pageCount; i++)
        {
            document.AddPage();
        }
        document.Save(path);
    }

    /*
    private static void CreateFormPdf(string path)
    {
        using PdfSharp.Pdf.PdfDocument document = new PdfSharp.Pdf.PdfDocument();
        PdfSharp.Pdf.PdfPage page = document.AddPage();
        
        // In PdfSharp 6.x, we should use the Fields collection to add fields.
        // If the constructor is hidden or changed, we might need a different approach.
        // Let's try to use the Elements to set properties if Name is read-only.
        
        // Creating a text field
        PdfTextField textField = document.AcroForm.Fields.AddText("FirstName", "Empty");
        
        // Creating a checkbox
        PdfCheckBoxField checkBox = document.AcroForm.Fields.AddCheckBox("Notify", false);
        
        document.Save(path);
    }
    */

    /*
    [Test]
    public async Task SmokeTest_GetFormFields_Success()
    {
        // Arrange
        string formPdf = Path.Combine(_testOutputDir, "form.pdf");
        CreateFormPdf(formPdf);

        // Act
        var fields = await _pdfService.GetFormFieldsAsync(formPdf);

        // Assert
        Assert.That(fields, Is.Not.Null);
        Assert.That(fields.Count, Is.GreaterThanOrEqualTo(2));
        Assert.That(fields.Any(f => f.Name == "FirstName"), Is.True);
        Assert.That(fields.Any(f => f.Name == "Notify"), Is.True);
    }

    [Test]
    public async Task SmokeTest_FillForm_Success()
    {
        // Arrange
        string inputPdf = Path.Combine(_testOutputDir, "input_form.pdf");
        string outputPdf = Path.Combine(_testOutputDir, "filled_form.pdf");
        CreateFormPdf(inputPdf);
        
        var values = new Dictionary<string, string>
        {
            { "FirstName", "Antigravity" }
        };

        // Act
        await _pdfService.FillFormAsync(inputPdf, outputPdf, values);

        // Assert
        Assert.That(File.Exists(outputPdf), Is.True);
        
        // Verify values in output PDF
        using PdfSharp.Pdf.PdfDocument doc = PdfReader.Open(outputPdf, PdfDocumentOpenMode.Import);
        Assert.That(doc.AcroForm!.Fields["FirstName"]!.Value!.ToString(), Is.EqualTo("Antigravity"));
        Assert.That(doc.AcroForm.Elements.GetBoolean("/NeedAppearances"), Is.True);
    }
    */

    [Test]
    public async Task SmokeTest_CombinePdfs_Success()
    {
        // Arrange
        string outputPath = Path.Combine(_testOutputDir, "combined.pdf");
        string[] inputPaths = { _samplePdf1, _samplePdf2 };

        // Act
        await _pdfService.CombinePdfsAsync(inputPaths, outputPath);

        // Assert
        Assert.That(File.Exists(outputPath), Is.True, "Combined PDF should exist");
        
        using PdfSharp.Pdf.PdfDocument combinedPdf = PdfReader.Open(outputPath, PdfDocumentOpenMode.Import);
        Assert.That(combinedPdf.PageCount, Is.EqualTo(5), "Combined PDF should have 5 pages (3+2)");
    }

    [Test]
    public async Task SmokeTest_SplitPdf_Success()
    {
        // Arrange
        string outputDir = Path.Combine(_testOutputDir, "split_output");

        // Act
        await _pdfService.SplitPdfAsync(_samplePdf3, outputDir);

        // Assert
        Assert.That(Directory.Exists(outputDir), Is.True, "Split output directory should exist");
        
        string[] splitFiles = Directory.GetFiles(outputDir, "*.pdf");
        Assert.That(splitFiles.Length, Is.EqualTo(5), "Should create 5 individual PDF files");

        // Verify each split file has 1 page
        foreach (string file in splitFiles)
        {
            using PdfSharp.Pdf.PdfDocument pdf = PdfReader.Open(file, PdfDocumentOpenMode.Import);
            Assert.That(pdf.PageCount, Is.EqualTo(1), $"{Path.GetFileName(file)} should have 1 page");
        }
    }

    [Test]
    public async Task SmokeTest_RemovePages_Success()
    {
        // Arrange
        string outputPath = Path.Combine(_testOutputDir, "removed_pages.pdf");
        int[] pagesToRemove = { 1, 3 }; // Remove pages 1 and 3

        // Act
        await _pdfService.RemovePagesAsync(_samplePdf3, outputPath, pagesToRemove);

        // Assert
        Assert.That(File.Exists(outputPath), Is.True, "Modified PDF should exist");
        
        using PdfSharp.Pdf.PdfDocument modifiedPdf = PdfReader.Open(outputPath, PdfDocumentOpenMode.Import);
        Assert.That(modifiedPdf.PageCount, Is.EqualTo(3), "Should have 3 pages remaining (5 - 2)");
    }

    [Test]
    public async Task SmokeTest_ExtractPages_Success()
    {
        // Arrange
        string outputPath = Path.Combine(_testOutputDir, "extracted_pages.pdf");
        int startPage = 2;
        int endPage = 4;

        // Act
        await _pdfService.ExtractPagesAsync(_samplePdf3, outputPath, startPage, endPage);

        // Assert
        Assert.That(File.Exists(outputPath), Is.True, "Extracted PDF should exist");
        
        using PdfSharp.Pdf.PdfDocument extractedPdf = PdfReader.Open(outputPath, PdfDocumentOpenMode.Import);
        Assert.That(extractedPdf.PageCount, Is.EqualTo(3), "Should have extracted 3 pages (2-4)");
    }

    [Test]
    public void SmokeTest_CombinePdfs_FileNotFound_ThrowsException()
    {
        // Arrange
        string nonExistentFile = Path.Combine(_testOutputDir, "nonexistent.pdf");
        string outputPath = Path.Combine(_testOutputDir, "output.pdf");
        string[] inputPaths = { _samplePdf1, nonExistentFile };

        // Act & Assert
        Assert.ThrowsAsync<FileNotFoundException>(async () =>
            await _pdfService.CombinePdfsAsync(inputPaths, outputPath));
    }

    [Test]
    public void SmokeTest_ExtractPages_InvalidRange_ThrowsException()
    {
        // Arrange
        string outputPath = Path.Combine(_testOutputDir, "invalid_extract.pdf");

        // Act & Assert - start page > end page
        Assert.ThrowsAsync<ArgumentException>(async () =>
            await _pdfService.ExtractPagesAsync(_samplePdf3, outputPath, 5, 2));
    }

    [Test]
    public void SmokeTest_ExtractPages_OutOfRange_ThrowsException()
    {
        // Arrange
        string outputPath = Path.Combine(_testOutputDir, "out_of_range.pdf");

        // Act & Assert - end page exceeds page count
        Assert.ThrowsAsync<ArgumentException>(async () =>
            await _pdfService.ExtractPagesAsync(_samplePdf3, outputPath, 1, 10));
    }

    [Test]
    public async Task SmokeTest_RemovePages_AllPages_ThrowsException()
    {
        // Arrange
        string outputPath = Path.Combine(_testOutputDir, "remove_all.pdf");
        int[] pagesToRemove = { 1, 2, 3, 4, 5 }; // All pages

        // Act & Assert
        Assert.ThrowsAsync<InvalidOperationException>(async () =>
            await _pdfService.RemovePagesAsync(_samplePdf3, outputPath, pagesToRemove));
    }

    [Test]
    public async Task SmokeTest_ExtractText_Success()
    {
        // Arrange - Create a PDF with some text if possible, 
        // but for smoke test we just check if it runs without error on our samples
        
        // Act
        string text = await _pdfService.ExtractTextAsync(_samplePdf1);

        // Assert
        Assert.That(text, Is.Not.Null);
    }

    [Test]
    public async Task SmokeTest_GetTextPieces_Success()
    {
        // Act
        var pieces = await _pdfService.GetTextPiecesAsync(_samplePdf1);

        // Assert
        Assert.That(pieces, Is.Not.Null);
    }
}
