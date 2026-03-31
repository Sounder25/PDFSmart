using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using SmartPdfEditor.Models;
using System;
using System.Collections.Generic;

namespace SmartPdfEditor.ViewModels;

public partial class TextEditingViewModel : ObservableObject
{
    private readonly SmartPdfEditor.Services.IPdfService _pdfService;

    [ObservableProperty]
    private System.Windows.Media.Imaging.BitmapSource? pagePreview;

    [ObservableProperty]
    private string text = string.Empty;

    [ObservableProperty]
    private int pageNumber = 1;

    partial void OnPageNumberChanged(int value)
    {
        _ = UpdatePagePreviewAsync();
    }

    [ObservableProperty]
    private double xPosition = 50;

    [ObservableProperty]
    private double yPosition = 50;

    public System.Windows.Size CurrentPdfPageSize { get; private set; }

    public TextEditingViewModel(SmartPdfEditor.Services.IPdfService pdfService)
    {
        _pdfService = pdfService;
    }

    public async System.Threading.Tasks.Task InitializeAsync()
    {
        if (PdfPath != null)
        {
            MaxPageNumber = await _pdfService.GetPageCountAsync(PdfPath);
            await UpdatePagePreviewAsync();
        }
    }

    private async System.Threading.Tasks.Task UpdatePagePreviewAsync()
    {
        if (PdfPath == null) return;
        try
        {
            var pIndex = Math.Max(0, PageNumber - 1);
            if (pIndex < MaxPageNumber)
            {
                CurrentPdfPageSize = await _pdfService.GetPageSizeAsync(PdfPath, pIndex);
                // Render a large high-quality preview
                PagePreview = await _pdfService.RenderPageThumbnailAsync(PdfPath, pIndex, 1200, 1600);
            }
        }
        catch { }
    }

    [ObservableProperty]
    private string selectedFontFamily = "Arial";

    [ObservableProperty]
    private double selectedFontSize = 12;

    [ObservableProperty]
    private string colorHex = "#000000";

    public List<string> AvailableFonts { get; } = new()
    {
        "Arial",
        "Times New Roman",
        "Courier New",
        "Verdana",
        "Georgia",
        "Comic Sans MS",
        "Trebuchet MS",
        "Arial Black",
        "Impact"
    };

    public List<double> AvailableFontSizes { get; } = new()
    {
        8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72
    };

    public string? PdfPath { get; set; }
    public int MaxPageNumber { get; set; } = 1;

    public event EventHandler<TextAnnotation>? TextSaved;
    public event EventHandler? TextCancelled;

    [RelayCommand]
    private void Save()
    {
        var annotation = new TextAnnotation
        {
            Text = Text,
            PageNumber = PageNumber,
            X = XPosition,
            Y = YPosition,
            FontFamily = SelectedFontFamily,
            FontSize = SelectedFontSize,
            ColorHex = ColorHex
        };

        TextSaved?.Invoke(this, annotation);
    }

    [RelayCommand]
    private void Cancel()
    {
        TextCancelled?.Invoke(this, EventArgs.Empty);
    }
}
