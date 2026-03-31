using System.IO;
using System.Windows;
using System.Windows.Threading;
using PdfSharp.Fonts;
using SmartPdfEditor.Services;
using SmartPdfEditor.ViewModels;

namespace SmartPdfEditor;

/// <summary>
/// Interaction logic for App.xaml
/// </summary>
public partial class App : System.Windows.Application
{
    public void OnStartup(object sender, StartupEventArgs e)
    {
        GlobalFontSettings.FontResolver = new WindowsFontResolver();

        DispatcherUnhandledException += OnDispatcherUnhandledException;
        MainWindow mainWindow = new MainWindow();
        
        if (e.Args.Length > 0)
        {
            string filePath = e.Args[0];
            if (File.Exists(filePath) && filePath.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            {
                if (mainWindow.DataContext is MainViewModel vm)
                {
                    vm.CurrentPdfPath = filePath;
                    vm.Title = $"PDFSmart - {Path.GetFileName(filePath)}";

                    if (PdfPreviewCompatibility.IsLikelyAdobeDynamicForm(filePath))
                    {
                        vm.PdfSource = null;
                        vm.NoPdfLoaded = true;
                        vm.HasPdfLoaded = false;
                        vm.StatusMessage = "This PDF requires Adobe Reader (XFA/dynamic form). Preview disabled.";

                        var result = MessageBox.Show(
                            "This PDF appears to be an Adobe dynamic/XFA form.\n\n" +
                            "PDFSmart cannot preview this type safely yet, so preview is disabled to keep the app stable.\n\n" +
                            "Open it in your default PDF app now?",
                            "Preview Not Supported",
                            MessageBoxButton.YesNo,
                            MessageBoxImage.Warning);

                        if (result == MessageBoxResult.Yes)
                        {
                            if (ExternalPdfLauncher.TryOpenInDefaultViewer(filePath, out var errorMessage))
                            {
                                vm.StatusMessage = "Opened in external PDF viewer.";
                            }
                            else
                            {
                                vm.StatusMessage = "Could not open external viewer.";
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
                        vm.PdfSource = new Uri(filePath);
                        vm.NoPdfLoaded = false;
                        vm.HasPdfLoaded = true;
                        vm.StatusMessage = $"Loaded: {Path.GetFileName(filePath)}";
                    }
                }
            }
        }
        
        mainWindow.Show();
    }

    private void OnDispatcherUnhandledException(object sender, DispatcherUnhandledExceptionEventArgs e)
    {
        try
        {
            string docPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "PDFSmart");
            Directory.CreateDirectory(docPath);
            string logFile = Path.Combine(docPath, "crash.log");

            string logEntry = $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] CRASH: {e.Exception.Message}\n{e.Exception.StackTrace}\n\n";
            File.AppendAllText(logFile, logEntry);

            MessageBox.Show(
                $"PDFSmart encountered an unexpected error.\n\nA crash report has been saved to:\n{logFile}\n\nPlease share this file with the developer.",
                "PDFSmart Crashed",
                MessageBoxButton.OK,
                MessageBoxImage.Error);
        }
        catch
        {
            // If logging fails, fall back to basic message
            MessageBox.Show(
                $"Unexpected error: {e.Exception.Message}",
                "PDFSmart Error",
                MessageBoxButton.OK,
                MessageBoxImage.Error);
        }

        e.Handled = true;
    }
}
