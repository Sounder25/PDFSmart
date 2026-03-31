using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using SmartPdfEditor.Models;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Windows;
using SmartPdfEditor.Services;

namespace SmartPdfEditor.ViewModels;

public partial class TextPiecesViewModel : ObservableObject
{
    private readonly IPdfService _pdfService;

    [ObservableProperty]
    private ObservableCollection<TextPieceViewModel> pieces = new();

    [ObservableProperty]
    private string pdfPath = string.Empty;

    public event EventHandler? RequestClose;

    public TextPiecesViewModel(IPdfService pdfService)
    {
        _pdfService = pdfService;
    }

    public void LoadPieces(List<TextPiece> textPieces)
    {
        Pieces.Clear();
        foreach (var piece in textPieces)
        {
            Pieces.Add(new TextPieceViewModel(piece, _pdfService, this));
        }
    }

    [RelayCommand]
    private void Close()
    {
        RequestClose?.Invoke(this, EventArgs.Empty);
    }

    [RelayCommand]
    private void CopyAllSelected()
    {
        var selectedText = string.Join(Environment.NewLine + Environment.NewLine, 
            Pieces.Where(p => p.IsSelected).Select(p => p.Text));

        if (!string.IsNullOrEmpty(selectedText))
        {
            Clipboard.SetText(selectedText);
        }
    }
}

public partial class TextPieceViewModel : ObservableObject
{
    private readonly IPdfService _pdfService;
    private readonly TextPiecesViewModel _parent;
    private readonly TextPiece _originalPiece;

    [ObservableProperty]
    private string text = string.Empty;

    [ObservableProperty]
    private string metadata = string.Empty;

    [ObservableProperty]
    private bool isSelected;

    public TextPieceViewModel(TextPiece piece, IPdfService pdfService, TextPiecesViewModel parent)
    {
        _originalPiece = piece;
        _pdfService = pdfService;
        _parent = parent;
        Text = piece.Text;
        Metadata = piece.Metadata ?? $"Page {piece.PageNumber}";
    }

    [RelayCommand]
    private void CopyPiece()
    {
        if (!string.IsNullOrEmpty(Text))
        {
            Clipboard.SetText(Text);
        }
    }

    [RelayCommand]
    private async Task SaveToPdfAsync()
    {
        try
        {
            Microsoft.Win32.SaveFileDialog saveFileDialog = new Microsoft.Win32.SaveFileDialog
            {
                Filter = "PDF Files (*.pdf)|*.pdf",
                Title = "Save Modified PDF As",
                FileName = System.IO.Path.GetFileNameWithoutExtension(_parent.PdfPath) + "_edited.pdf"
            };

            if (saveFileDialog.ShowDialog() == true)
            {
                await _pdfService.ReplaceTextAsync(_parent.PdfPath, saveFileDialog.FileName, _originalPiece, Text);
                MessageBox.Show("Changes saved to PDF successfully!", "Success", MessageBoxButton.OK, MessageBoxImage.Information);
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Error saving to PDF: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }
}
