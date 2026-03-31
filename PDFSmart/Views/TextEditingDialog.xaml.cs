using SmartPdfEditor.ViewModels;
using System.Windows;
using System;

namespace SmartPdfEditor.Views;

/// <summary>
/// Interaction logic for TextEditingDialog.xaml
/// </summary>
public partial class TextEditingDialog : Window
{
    public TextEditingDialog(TextEditingViewModel viewModel)
    {
        InitializeComponent();
        DataContext = viewModel;

        // Close dialog when save or cancel is triggered
        viewModel.TextSaved += (s, e) => DialogResult = true;
        viewModel.TextCancelled += (s, e) => DialogResult = false;
    }

    private void PdfImage_MouseDown(object sender, System.Windows.Input.MouseButtonEventArgs e)
    {
        if (DataContext is TextEditingViewModel vm && sender is System.Windows.Controls.Image img)
        {
            var pos = e.GetPosition(img);
            
            // Calculate proportion of the click within the displayed image bounds
            double xRatio = pos.X / img.ActualWidth;
            double yRatio = pos.Y / img.ActualHeight;

            // Translate proportion to actual PDF points size
            if (vm.CurrentPdfPageSize.Width > 0 && vm.CurrentPdfPageSize.Height > 0)
            {
                vm.XPosition = Math.Round(xRatio * vm.CurrentPdfPageSize.Width, 2);
                vm.YPosition = Math.Round(yRatio * vm.CurrentPdfPageSize.Height, 2);
            }
        }
    }
}
