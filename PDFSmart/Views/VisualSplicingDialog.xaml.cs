using SmartPdfEditor.ViewModels;
using System.Windows;

namespace SmartPdfEditor.Views;

public partial class VisualSplicingDialog : Window
{
    public VisualSplicingDialog(VisualSplicingViewModel viewModel)
    {
        InitializeComponent();
        DataContext = viewModel;

        viewModel.SplicingCompleted += (s, e) => DialogResult = true;
        viewModel.SplicingCancelled += (s, e) => DialogResult = false;
    }
}
