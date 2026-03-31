using System.Windows;
using System.Windows.Threading;
using Microsoft.Web.WebView2.Core;
using SmartPdfEditor.Services;
using SmartPdfEditor.ViewModels;

namespace SmartPdfEditor;

/// <summary>
/// Interaction logic for MainWindow.xaml
/// </summary>
public partial class MainWindow : Window
{
    private string? _lastExternalOpenPromptPath;

    public MainWindow()
    {
        InitializeComponent();
        Loaded += OnLoaded;
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        // Ensure WebView2 runtime is ready before any navigation occurs.
        await PdfWebView.EnsureCoreWebView2Async();

        // Enable right-click context menu so users can Copy selected text.
        PdfWebView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
        PdfWebView.CoreWebView2.Settings.IsStatusBarEnabled = false;

        PdfWebView.NavigationCompleted += OnPdfNavigationCompleted;

        // If a PDF was already queued (e.g. opened via command-line arg), load it now.
        if (DataContext is MainViewModel vm && vm.PdfSource is not null)
            PdfWebView.Source = vm.PdfSource;
    }

    private async void OnPdfNavigationCompleted(object? sender, CoreWebView2NavigationCompletedEventArgs e)
    {
        if (!e.IsSuccess || DataContext is not MainViewModel vm || string.IsNullOrWhiteSpace(vm.CurrentPdfPath))
            return;

        try
        {
            // Read visible page text from WebView2 to catch Adobe/XFA placeholder pages.
            string scriptResult = await PdfWebView.ExecuteScriptAsync(
                "document && document.body ? document.body.innerText : ''");

            string pageText = System.Text.Json.JsonSerializer.Deserialize<string>(scriptResult) ?? string.Empty;

            bool hasAdobePlaceholder =
                pageText.Contains("If this message is not eventually replaced", StringComparison.OrdinalIgnoreCase) ||
                pageText.Contains("your PDF viewer may not be able to display this type of document", StringComparison.OrdinalIgnoreCase) ||
                pageText.Contains("upgrade to the latest version of Adobe Reader", StringComparison.OrdinalIgnoreCase);

            if (!hasAdobePlaceholder || string.Equals(_lastExternalOpenPromptPath, vm.CurrentPdfPath, StringComparison.OrdinalIgnoreCase))
                return;

            _lastExternalOpenPromptPath = vm.CurrentPdfPath;
            vm.PdfSource = null;
            vm.NoPdfLoaded = true;
            vm.HasPdfLoaded = false;
            vm.StatusMessage = "Adobe/XFA PDF detected. Preview disabled.";

            var result = MessageBox.Show(
                "This file uses an Adobe-only PDF format (dynamic/XFA).\n\nOpen it in your default PDF app now?",
                "Adobe PDF Required",
                MessageBoxButton.YesNo,
                MessageBoxImage.Information);

            if (result == MessageBoxResult.Yes &&
                !ExternalPdfLauncher.TryOpenInDefaultViewer(vm.CurrentPdfPath, out var errorMessage))
            {
                MessageBox.Show(
                    $"Could not open file in external PDF app: {errorMessage}",
                    "Open Failed",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
            }
        }
        catch
        {
            // Ignore WebView script failures; they should not crash the app.
        }
    }

    private void Window_DragOver(object sender, DragEventArgs e)
    {
        if (e.Data.GetDataPresent(DataFormats.FileDrop))
        {
            var files = (string[])e.Data.GetData(DataFormats.FileDrop);
            e.Effects = files?.Length == 1 && files[0].EndsWith(".pdf", StringComparison.OrdinalIgnoreCase)
                ? DragDropEffects.Copy
                : DragDropEffects.None;
        }
        else
        {
            e.Effects = DragDropEffects.None;
        }
        e.Handled = true;
    }

    private void Window_Drop(object sender, DragEventArgs e)
    {
        if (!e.Data.GetDataPresent(DataFormats.FileDrop)) return;

        var files = (string[])e.Data.GetData(DataFormats.FileDrop);
        if (files?.Length >= 1 && files[0].EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
        {
            if (DataContext is MainViewModel vm)
            {
                // Use reflection to call the private LoadPdf method, or make it internal
                vm.CurrentPdfPath = files[0];
                vm.Title = $"PDFSmart - {System.IO.Path.GetFileName(files[0])}";

                if (PdfPreviewCompatibility.IsLikelyAdobeDynamicForm(files[0]))
                {
                    vm.PdfSource = null;
                    vm.NoPdfLoaded = true;
                    vm.HasPdfLoaded = false;
                    vm.StatusMessage = "Adobe/XFA PDF detected. Preview disabled.";
                }
                else
                {
                    vm.PdfSource = new Uri(files[0]);
                    vm.NoPdfLoaded = false;
                    vm.HasPdfLoaded = true;
                    vm.StatusMessage = $"Loaded: {System.IO.Path.GetFileName(files[0])}";
                }
            }
        }
    }
}