using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Win32;
using SmartPdfEditor.Services;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;

namespace SmartPdfEditor.ViewModels;

public partial class MainViewModel : ObservableObject
{
    private readonly IPdfService _pdfService;

    [ObservableProperty]
    private string title = "PDFSmart";

    [ObservableProperty]
    private string statusMessage = "Ready";

    [ObservableProperty]
    private string? currentPdfPath;

    [ObservableProperty]
    private Uri? pdfSource;

    [ObservableProperty]
    private bool noPdfLoaded = true;

    [ObservableProperty]
    [NotifyCanExecuteChangedFor(nameof(FillFormCommand))]
    [NotifyCanExecuteChangedFor(nameof(AddTextCommand))]
    [NotifyCanExecuteChangedFor(nameof(SmartExtractCommand))]
    [NotifyCanExecuteChangedFor(nameof(ExportImagesCommand))]
    [NotifyCanExecuteChangedFor(nameof(MakeSearchableCommand))]
    [NotifyCanExecuteChangedFor(nameof(CopyTextCommand))]
    private bool hasPdfLoaded = false;

    public MainViewModel() : this(new PdfSharpService())
    {
    }

    public MainViewModel(IPdfService pdfService)
    {
        _pdfService = pdfService;
    }

    [RelayCommand]
    private void OpenPdf()
    {
        try
        {
            OpenFileDialog openFileDialog = new OpenFileDialog
            {
                Filter = "PDF Files (*.pdf)|*.pdf|All Files (*.*)|*.*",
                Title = "Open PDF File"
            };

            if (openFileDialog.ShowDialog() == true)
            {
                LoadPdf(openFileDialog.FileName);
            }
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error: {ex.Message}";
            MessageBox.Show($"Error opening file: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    [RelayCommand]
    private async Task CombinePdfsAsync()
    {
        try
        {
            OpenFileDialog openFileDialog = new OpenFileDialog
            {
                Filter = "PDF Files (*.pdf)|*.pdf",
                Title = "Select PDFs to Combine",
                Multiselect = true
            };

            if (openFileDialog.ShowDialog() != true || openFileDialog.FileNames.Length < 2)
            {
                MessageBox.Show("Please select at least 2 PDF files to combine.", "Info", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            SaveFileDialog saveFileDialog = new SaveFileDialog
            {
                Filter = "PDF Files (*.pdf)|*.pdf",
                Title = "Save Combined PDF As",
                FileName = "combined.pdf"
            };

            if (saveFileDialog.ShowDialog() != true)
                return;

            StatusMessage = "Combining PDFs...";
            await _pdfService.CombinePdfsAsync(openFileDialog.FileNames, saveFileDialog.FileName);
            StatusMessage = $"Combined {openFileDialog.FileNames.Length} PDFs successfully!";
            
            MessageBox.Show($"Successfully combined {openFileDialog.FileNames.Length} PDFs into:\n{saveFileDialog.FileName}", "Success", MessageBoxButton.OK, MessageBoxImage.Information);
        }
        catch (Exception ex)
        {
            StatusMessage = "Error combining PDFs.";
            MessageBox.Show($"Error: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    [RelayCommand]
    private async Task SplitPdfAsync()
    {
        try
        {
            OpenFileDialog openFileDialog = new OpenFileDialog
            {
                Filter = "PDF Files (*.pdf)|*.pdf",
                Title = "Select PDF to Split"
            };

            if (openFileDialog.ShowDialog() != true)
                return;

            // Ask for output folder using simple approach
            string outputFolder = Path.Combine(Path.GetDirectoryName(openFileDialog.FileName) ?? "", 
                Path.GetFileNameWithoutExtension(openFileDialog.FileName) + "_split");
            
            StatusMessage = "Splitting PDF...";
            await _pdfService.SplitPdfAsync(openFileDialog.FileName, outputFolder);
            StatusMessage = "PDF split successfully!";
            
            MessageBox.Show($"PDF split into individual pages at:\n{outputFolder}", "Success", MessageBoxButton.OK, MessageBoxImage.Information);
        }
        catch (Exception ex)
        {
            StatusMessage = "Error splitting PDF.";
            MessageBox.Show($"Error: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    [RelayCommand]
    private async Task RemovePagesAsync()
    {
        try
        {
            OpenFileDialog openFileDialog = new OpenFileDialog
            {
                Filter = "PDF Files (*.pdf)|*.pdf",
                Title = "Select PDF to Remove Pages From"
            };

            if (openFileDialog.ShowDialog() != true)
                return;

            // Simple input dialog
            string? input = ShowInputDialog("Enter page numbers to remove (comma-separated, e.g., 1,3,5):", "Remove Pages");
            if (string.IsNullOrWhiteSpace(input))
                return;

            List<int> pageNumbers = input
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(s => int.TryParse(s.Trim(), out int n) ? n : -1)
                .Where(n => n > 0)
                .ToList();

            if (pageNumbers.Count == 0)
            {
                MessageBox.Show("No valid page numbers entered.", "Warning", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            SaveFileDialog saveFileDialog = new SaveFileDialog
            {
                Filter = "PDF Files (*.pdf)|*.pdf",
                Title = "Save Modified PDF As",
                FileName = Path.GetFileNameWithoutExtension(openFileDialog.FileName) + "_modified.pdf"
            };

            if (saveFileDialog.ShowDialog() != true)
                return;

            StatusMessage = $"Removing pages {string.Join(", ", pageNumbers)}...";
            await _pdfService.RemovePagesAsync(openFileDialog.FileName, saveFileDialog.FileName, pageNumbers);
            StatusMessage = "Pages removed successfully!";
            
            MessageBox.Show($"Removed pages {string.Join(", ", pageNumbers)} and saved to:\n{saveFileDialog.FileName}", "Success", MessageBoxButton.OK, MessageBoxImage.Information);
        }
        catch (Exception ex)
        {
            StatusMessage = "Error removing pages.";
            MessageBox.Show($"Error: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    [RelayCommand]
    private async Task ExtractPagesAsync()
    {
        try
        {
            OpenFileDialog openFileDialog = new OpenFileDialog
            {
                Filter = "PDF Files (*.pdf)|*.pdf",
                Title = "Select PDF to Extract Pages From"
            };

            if (openFileDialog.ShowDialog() != true)
                return;

            string? input = ShowInputDialog("Enter page range to extract (e.g., 2-5):", "Extract Pages");
            if (string.IsNullOrWhiteSpace(input))
                return;

            string[] parts = input.Split('-');
            if (parts.Length != 2 ||
                !int.TryParse(parts[0].Trim(), out int startPage) ||
                !int.TryParse(parts[1].Trim(), out int endPage))
            {
                MessageBox.Show("Invalid range. Use format: start-end (e.g., 2-5)", "Warning", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            SaveFileDialog saveFileDialog = new SaveFileDialog
            {
                Filter = "PDF Files (*.pdf)|*.pdf",
                Title = "Save Extracted Pages As",
                FileName = Path.GetFileNameWithoutExtension(openFileDialog.FileName) + $"_pages_{startPage}-{endPage}.pdf"
            };

            if (saveFileDialog.ShowDialog() != true)
                return;

            StatusMessage = $"Extracting pages {startPage}-{endPage}...";
            await _pdfService.ExtractPagesAsync(openFileDialog.FileName, saveFileDialog.FileName, startPage, endPage);
            StatusMessage = "Pages extracted successfully!";
            
            MessageBox.Show($"Extracted pages {startPage}-{endPage} to:\n{saveFileDialog.FileName}", "Success", MessageBoxButton.OK, MessageBoxImage.Information);
        }
        catch (Exception ex)
        {
            StatusMessage = "Error extracting pages.";
            MessageBox.Show($"Error: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    [RelayCommand]
    private void OpenVisualSplicing()
    {
        try
        {
            StatusMessage = "Opening visual splicing tool...";
            var splicingVm = new VisualSplicingViewModel(_pdfService);
            var dialog = new SmartPdfEditor.Views.VisualSplicingDialog(splicingVm);
            
            if (dialog.ShowDialog() == true)
            {
                StatusMessage = "Visual splicing operation completed.";
            }
            else
            {
                StatusMessage = "Visual splicing cancelled.";
            }
        }
        catch (Exception ex)
        {
            StatusMessage = "Error opening visual splicing tool.";
            MessageBox.Show($"Error: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    [RelayCommand(CanExecute = nameof(HasPdfLoaded))]
    private async Task FillFormAsync()
    {
        try
        {
            if (string.IsNullOrEmpty(CurrentPdfPath))
            {
                MessageBox.Show("Please open a PDF file first.", "Info", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            StatusMessage = "Detecting form fields...";
            var fields = await _pdfService.GetFormFieldsAsync(CurrentPdfPath);

            if (fields.Count == 0)
            {
                StatusMessage = "No form fields found.";
                MessageBox.Show("This PDF does not contain any fillable form fields.", "Info", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            StatusMessage = $"Found {fields.Count} form field(s).";

            // Show form filling dialog
            var formVm = new FormFillingViewModel();
            formVm.LoadFields(fields);
            formVm.PdfPath = CurrentPdfPath;

            bool? dialogResult = null;
            Dictionary<string, string>? formValues = null;

            formVm.FormSaved += (s, values) =>
            {
                formValues = values;
                dialogResult = true;
            };
            formVm.FormCancelled += (s, e) =>
            {
                dialogResult = false;
            };

            var dialog = new SmartPdfEditor.Views.FormFillingDialog(formVm);
            dialog.ShowDialog();

            if (dialogResult == true && formValues != null)
            {
                SaveFileDialog saveFileDialog = new SaveFileDialog
                {
                    Filter = "PDF Files (*.pdf)|*.pdf",
                    Title = "Save Filled PDF As",
                    FileName = Path.GetFileNameWithoutExtension(CurrentPdfPath) + "_filled.pdf"
                };

                if (saveFileDialog.ShowDialog() == true)
                {
                    StatusMessage = "Saving filled form...";
                    await _pdfService.FillFormAsync(CurrentPdfPath, saveFileDialog.FileName, formValues);
                    StatusMessage = "Form filled successfully!";

                    MessageBox.Show($"Filled PDF saved to:\n{saveFileDialog.FileName}", "Success", MessageBoxButton.OK, MessageBoxImage.Information);
                }
            }
            else
            {
                StatusMessage = "Form filling cancelled.";
            }
        }
        catch (Exception ex)
        {
            StatusMessage = "Error filling form.";
            MessageBox.Show($"Error: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    [RelayCommand(CanExecute = nameof(HasPdfLoaded))]
    private async Task AddTextAsync()
    {
        try
        {
            if (string.IsNullOrEmpty(CurrentPdfPath))
            {
                MessageBox.Show("Please open a PDF file first.", "Info", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            StatusMessage = "Opening text editor...";

            // Create and show text editing dialog
            var textVm = new TextEditingViewModel(_pdfService)
            {
                PdfPath = CurrentPdfPath
            };

            // Ensure the preview initializes right away
            await textVm.InitializeAsync();

            SmartPdfEditor.Models.TextAnnotation? annotation = null;
            bool? dialogResult = null;

            textVm.TextSaved += (s, a) =>
            {
                annotation = a;
                dialogResult = true;
            };
            textVm.TextCancelled += (s, e) =>
            {
                dialogResult = false;
            };

            var dialog = new SmartPdfEditor.Views.TextEditingDialog(textVm);
            dialog.ShowDialog();

            if (dialogResult == true && annotation != null)
            {
                SaveFileDialog saveFileDialog = new SaveFileDialog
                {
                    Filter = "PDF Files (*.pdf)|*.pdf",
                    Title = "Save PDF with Text As",
                    FileName = Path.GetFileNameWithoutExtension(CurrentPdfPath) + "_text.pdf"
                };

                if (saveFileDialog.ShowDialog() == true)
                {
                    StatusMessage = "Adding text to PDF...";
                    await _pdfService.AddTextAsync(CurrentPdfPath, saveFileDialog.FileName, annotation);
                    StatusMessage = "Text added successfully!";

                    MessageBox.Show($"Text added to PDF and saved to:\n{saveFileDialog.FileName}", "Success", MessageBoxButton.OK, MessageBoxImage.Information);

                    // Optionally reload the new PDF
                    var result = MessageBox.Show("Would you like to open the new PDF?", "Open New PDF", MessageBoxButton.YesNo, MessageBoxImage.Question);
                    if (result == MessageBoxResult.Yes)
                    {
                        CurrentPdfPath = saveFileDialog.FileName;
                        Title = $"PDFSmart - {Path.GetFileName(CurrentPdfPath)}";
                        PdfSource = new Uri(CurrentPdfPath);
                        StatusMessage = $"Loaded: {Path.GetFileName(CurrentPdfPath)}";
                    }
                }
            }
            else
            {
                StatusMessage = "Text addition cancelled.";
            }
        }
        catch (Exception ex)
        {
            StatusMessage = "Error adding text.";
            MessageBox.Show($"Error: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    [RelayCommand(CanExecute = nameof(HasPdfLoaded))]
    private async Task SmartExtractAsync()
    {
        try
        {
            if (string.IsNullOrEmpty(CurrentPdfPath))
            {
                MessageBox.Show("Please open a PDF file first.", "Info", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            StatusMessage = "Extracting text pieces...";
            var pieces = await _pdfService.GetTextPiecesAsync(CurrentPdfPath);

            if (pieces.Count == 0)
            {
                StatusMessage = "No text found in PDF.";
                MessageBox.Show("No extractable text found in this PDF.", "Info", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            StatusMessage = $"Extracted {pieces.Count} text piece(s).";

            var piecesVm = new TextPiecesViewModel(_pdfService);
            piecesVm.LoadPieces(pieces);
            piecesVm.PdfPath = CurrentPdfPath;

            var dialog = new SmartPdfEditor.Views.TextPiecesDialog(piecesVm);
            dialog.ShowDialog();
            
            StatusMessage = "Smart extraction complete.";
        }
        catch (Exception ex)
        {
            StatusMessage = "Error in smart extraction.";
            MessageBox.Show($"Error: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    [RelayCommand(CanExecute = nameof(HasPdfLoaded))]
    private async Task CopyTextAsync()
    {
        try
        {
            if (string.IsNullOrEmpty(CurrentPdfPath))
            {
                MessageBox.Show("Please open a PDF file first.", "Info", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            StatusMessage = "Extracting text...";
            string text = await _pdfService.ExtractTextAsync(CurrentPdfPath);

            if (string.IsNullOrWhiteSpace(text))
            {
                StatusMessage = "No text found.";
                MessageBox.Show("No extractable text found in this PDF.", "Info", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            Clipboard.SetText(text);
            StatusMessage = "Text copied to clipboard!";
        }
        catch (Exception ex)
        {
            StatusMessage = "Error copying text.";
            MessageBox.Show($"Error: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    [RelayCommand(CanExecute = nameof(HasPdfLoaded))]
    private async Task ExportImagesAsync()
    {
        try
        {
            if (string.IsNullOrEmpty(CurrentPdfPath))
            {
                MessageBox.Show("Please open a PDF file first.", "Info", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            if (!File.Exists(CurrentPdfPath))
            {
                MessageBox.Show("The selected PDF could not be found. Please open it again.", "Info", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            OpenFileDialog folderDialog = new OpenFileDialog
            {
                Title = "Select output folder for exported images",
                CheckFileExists = false,
                CheckPathExists = true,
                ValidateNames = false,
                FileName = "Select Folder"
            };

            if (folderDialog.ShowDialog() != true)
                return;

            string? selectedPath = Path.GetDirectoryName(folderDialog.FileName);
            if (string.IsNullOrWhiteSpace(selectedPath))
                return;

            StatusMessage = "Exporting pages to images...";
            await _pdfService.ExportPagesToImagesAsync(CurrentPdfPath, selectedPath, 300, "png");
            StatusMessage = "Pages exported successfully!";

            MessageBox.Show(
                $"Exported images to:\n{selectedPath}",
                "Success",
                MessageBoxButton.OK,
                MessageBoxImage.Information);
        }
        catch (Exception ex)
        {
            StatusMessage = "Error exporting pages.";
            MessageBox.Show($"Error: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    [RelayCommand(CanExecute = nameof(HasPdfLoaded))]
    private async Task MakeSearchableAsync()
    {
        try
        {
            if (string.IsNullOrEmpty(CurrentPdfPath))
            {
                MessageBox.Show("Please open a PDF file first.", "Info", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            SaveFileDialog saveFileDialog = new SaveFileDialog
            {
                Filter = "PDF Files (*.pdf)|*.pdf",
                Title = "Save Searchable PDF As",
                FileName = Path.GetFileNameWithoutExtension(CurrentPdfPath) + "_searchable.pdf"
            };

            if (saveFileDialog.ShowDialog() != true)
                return;

            StatusMessage = "Running OCR...";
            await _pdfService.MakeSearchablePdfAsync(CurrentPdfPath, saveFileDialog.FileName, "eng", 300);
            StatusMessage = "Searchable PDF created!";

            MessageBox.Show(
                $"Searchable PDF saved to:\n{saveFileDialog.FileName}\n\n" +
                "Note: Place OCR language files in a 'tessdata' folder next to the app if OCR fails.",
                "Success",
                MessageBoxButton.OK,
                MessageBoxImage.Information);
        }
        catch (Exception ex)
        {
            StatusMessage = "Error running OCR.";
            MessageBox.Show($"Error: {GetDetailedError(ex)}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    [RelayCommand]
    private async Task CreateOcrSampleAsync()
    {
        try
        {
            SaveFileDialog saveFileDialog = new SaveFileDialog
            {
                Filter = "PDF Files (*.pdf)|*.pdf",
                Title = "Save OCR Sample PDF As",
                FileName = "pdfsmart_ocr_sample.pdf"
            };

            if (saveFileDialog.ShowDialog() != true)
                return;

            StatusMessage = "Creating OCR sample PDF...";
            await _pdfService.CreateOcrSamplePdfAsync(saveFileDialog.FileName);
            StatusMessage = "OCR sample created!";

            LoadPdf(saveFileDialog.FileName);

            MessageBox.Show(
                $"Sample PDF saved to:\n{saveFileDialog.FileName}\n\nIt has been opened for OCR.",
                "Success",
                MessageBoxButton.OK,
                MessageBoxImage.Information);
        }
        catch (Exception ex)
        {
            StatusMessage = "Error creating sample PDF.";
            MessageBox.Show($"Error: {GetFriendlyError(ex)}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void LoadPdf(string pdfPath)
    {
        CurrentPdfPath = pdfPath;
        Title = $"PDFSmart - {Path.GetFileName(CurrentPdfPath)}";

        if (PdfPreviewCompatibility.IsLikelyAdobeDynamicForm(CurrentPdfPath))
        {
            // Avoid loading known-incompatible PDFs into WebView2 to prevent viewer crashes.
            PdfSource = null;
            NoPdfLoaded = true;
            HasPdfLoaded = false;
            StatusMessage = "This PDF requires Adobe Reader (XFA/dynamic form). Preview disabled.";

            var result = MessageBox.Show(
                "This PDF appears to be an Adobe dynamic/XFA form.\n\n" +
                "PDFSmart cannot preview this type safely yet, so preview is disabled to keep the app stable.\n\n" +
                "Open it in your default PDF app now?",
                "Preview Not Supported",
                MessageBoxButton.YesNo,
                MessageBoxImage.Warning);

            if (result == MessageBoxResult.Yes)
            {
                if (ExternalPdfLauncher.TryOpenInDefaultViewer(CurrentPdfPath, out var errorMessage))
                {
                    StatusMessage = "Opened in external PDF viewer.";
                }
                else
                {
                    StatusMessage = "Could not open external viewer.";
                    MessageBox.Show(
                        $"Could not open file in external PDF app: {errorMessage}",
                        "Open Failed",
                        MessageBoxButton.OK,
                        MessageBoxImage.Error);
                }
            }
        }
        else
        {
            // WebView2 can display standard PDFs directly
            PdfSource = new Uri(CurrentPdfPath);
            NoPdfLoaded = false;
            HasPdfLoaded = true;
            StatusMessage = $"Loaded: {Path.GetFileName(CurrentPdfPath)}";
        }
    }

    private static string GetFriendlyError(Exception exception)
    {
        Exception root = exception;

        while (root is TargetInvocationException && root.InnerException != null)
            root = root.InnerException;

        if (root is AggregateException aggregate)
        {
            root = aggregate.Flatten().InnerException ?? aggregate.GetBaseException();
        }
        else
        {
            root = root.GetBaseException();
        }

        return $"{root.GetType().Name}: {root.Message}";
    }

    private static string GetDetailedError(Exception exception)
    {
        return exception.ToString();
    }

    [RelayCommand]
    private static void Exit()
    {
        Application.Current.Shutdown();
    }

    private static string? ShowInputDialog(string prompt, string title)
    {
        // Simple WPF input dialog using a Window
        Window inputDialog = new Window
        {
            Title = title,
            Width = 400,
            Height = 150,
            WindowStartupLocation = WindowStartupLocation.CenterScreen,
            ResizeMode = ResizeMode.NoResize
        };

        StackPanel panel = new StackPanel { Margin = new Thickness(15) };
        TextBlock label = new TextBlock { Text = prompt, Margin = new Thickness(0, 0, 0, 10) };
        TextBox textBox = new TextBox { Margin = new Thickness(0, 0, 0, 15) };
        StackPanel buttonPanel = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right };
        Button okButton = new Button { Content = "OK", Width = 75, Margin = new Thickness(0, 0, 10, 0) };
        Button cancelButton = new Button { Content = "Cancel", Width = 75 };

        string? result = null;
        okButton.Click += (s, e) => { result = textBox.Text; inputDialog.Close(); };
        cancelButton.Click += (s, e) => inputDialog.Close();

        buttonPanel.Children.Add(okButton);
        buttonPanel.Children.Add(cancelButton);
        panel.Children.Add(label);
        panel.Children.Add(textBox);
        panel.Children.Add(buttonPanel);
        inputDialog.Content = panel;

        inputDialog.ShowDialog();
        return result;
    }
}
