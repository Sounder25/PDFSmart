using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Win32;
using SmartPdfEditor.Models;
using SmartPdfEditor.Services;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Threading;

namespace SmartPdfEditor.ViewModels;

public partial class VisualSplicingViewModel : ObservableObject
{
    private readonly IPdfService _pdfService;

    [ObservableProperty]
    private string statusMessage = "Load PDFs, select pages, and arrange them in the workspace.";

    [ObservableProperty]
    private bool isLoading;

    // The files loaded into the "Library" pane
    public ObservableCollection<PdfFileItem> LibraryFiles { get; } = new();

    // The individual pages selected in the "Workspace" pane
    public ObservableCollection<VisualSplicingItem> WorkspacePages { get; } = new();

    public event EventHandler? SplicingCompleted;
    public event EventHandler? SplicingCancelled;

    public VisualSplicingViewModel() : this(new PdfSharpService())
    {
    }

    public VisualSplicingViewModel(IPdfService pdfService)
    {
        _pdfService = pdfService;
    }

    [RelayCommand]
    private async Task LoadLibraryFilesAsync()
    {
        OpenFileDialog openFileDialog = new OpenFileDialog
        {
            Filter = "PDF Files (*.pdf)|*.pdf",
            Title = "Load PDFs into Library",
            Multiselect = true
        };

        if (openFileDialog.ShowDialog() == true)
        {
            IsLoading = true;
            try
            {
                foreach (var file in openFileDialog.FileNames)
                {
                    // Avoid adding duplicate files to the library
                    if (LibraryFiles.Any(f => f.FilePath.Equals(file, StringComparison.OrdinalIgnoreCase)))
                        continue;

                    var fileItem = new PdfFileItem(_pdfService, file);
                    LibraryFiles.Add(fileItem);
                    // Start loading thumbnails for this file asynchronously
                    _ = fileItem.LoadPagesAsync();
                }
                StatusMessage = $"Added {openFileDialog.FileNames.Length} file(s) to library.";
            }
            finally
            {
                IsLoading = false;
            }
        }
    }

    [RelayCommand]
    private void RemoveLibraryFile(PdfFileItem fileItem)
    {
        if (fileItem != null)
        {
            LibraryFiles.Remove(fileItem);
        }
    }

    [RelayCommand]
    private void AddPageToWorkspace(VisualSplicingItem pageItem)
    {
        if (pageItem != null)
        {
            WorkspacePages.Add(pageItem);
            StatusMessage = $"Added Page {pageItem.PageNumber} from {pageItem.FileName} to workspace.";
        }
    }

    [RelayCommand]
    private void RemovePageFromWorkspace(VisualSplicingItem pageItem)
    {
        if (pageItem != null)
        {
            WorkspacePages.Remove(pageItem);
            StatusMessage = $"Removed page from workspace.";
        }
    }

    [RelayCommand]
    private void MoveWorkspacePageLeft(VisualSplicingItem pageItem)
    {
        int index = WorkspacePages.IndexOf(pageItem);
        if (index > 0)
        {
            WorkspacePages.Move(index, index - 1);
        }
    }

    [RelayCommand]
    private void MoveWorkspacePageRight(VisualSplicingItem pageItem)
    {
        int index = WorkspacePages.IndexOf(pageItem);
        if (index >= 0 && index < WorkspacePages.Count - 1)
        {
            WorkspacePages.Move(index, index + 1);
        }
    }

    [RelayCommand]
    private void ClearWorkspace()
    {
        WorkspacePages.Clear();
        StatusMessage = "Workspace cleared.";
    }

    [RelayCommand]
    private async Task GenerateSplicedPdfAsync()
    {
        if (WorkspacePages.Count == 0)
        {
            MessageBox.Show("Please add at least one page to the workspace.", "Info", MessageBoxButton.OK, MessageBoxImage.Information);
            return;
        }

        SaveFileDialog saveFileDialog = new SaveFileDialog
        {
            Filter = "PDF Files (*.pdf)|*.pdf",
            Title = "Save Generated PDF As",
            FileName = "visual_spliced_output.pdf"
        };

        if (saveFileDialog.ShowDialog() != true)
            return;

        IsLoading = true;
        StatusMessage = "Generating PDF from workspace...";

        try
        {
            // Group workspace pages by source file to minimize opening/closing files overhead
            var items = new List<SplicingItem>();

            foreach(var page in WorkspacePages)
            {
                // Simple approach: add each page individually.
                // The underlying PerformSplicingAsync handles "1,2,3" format
                items.Add(new SplicingItem {
                    FilePath = page.SourcePath,
                    PageSelection = page.PageNumber.ToString() 
                });
            }

            await _pdfService.PerformSplicingAsync(items, saveFileDialog.FileName);
            StatusMessage = "PDF generated successfully!";
            
            MessageBox.Show($"Successfully generated PDF:\n{saveFileDialog.FileName}", "Success", MessageBoxButton.OK, MessageBoxImage.Information);
            SplicingCompleted?.Invoke(this, EventArgs.Empty);
        }
        catch (Exception ex)
        {
            StatusMessage = "Error generating PDF.";
            MessageBox.Show($"Error: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
        }
        finally
        {
            IsLoading = false;
        }
    }

    [RelayCommand]
    private void Cancel()
    {
        SplicingCancelled?.Invoke(this, EventArgs.Empty);
    }
}

/// <summary>
/// Helper class representing a loaded PDF in the library pane.
/// </summary>
public partial class PdfFileItem : ObservableObject
{
    private readonly IPdfService _pdfService;
    public string FilePath { get; }
    public string FileName { get; }

    [ObservableProperty]
    private bool isLoading;

    [ObservableProperty]
    private bool isExpanded;

    public ObservableCollection<VisualSplicingItem> Pages { get; } = new();

    public PdfFileItem(IPdfService pdfService, string filePath)
    {
        _pdfService = pdfService;
        FilePath = filePath;
        FileName = Path.GetFileName(filePath);
    }

    public async Task LoadPagesAsync()
    {
        IsLoading = true;
        try
        {
            int pageCount = await _pdfService.GetPageCountAsync(FilePath);

            // Fetch thumbnails in batches to keep UI responsive
            for (int i = 0; i < pageCount; i++)
            {
                var thumbnail = await _pdfService.RenderPageThumbnailAsync(FilePath, i, 150, 200);
                
                var item = new VisualSplicingItem
                {
                    SourcePath = FilePath,
                    PageIndex = i,
                    Thumbnail = thumbnail
                };

                // Add to UI thread context
                Application.Current.Dispatcher.Invoke(() => Pages.Add(item));
            }
        }
        catch (Exception)
        {
            // Ignore for now, or log it
        }
        finally
        {
            IsLoading = false;
            IsExpanded = true;
        }
    }
}
