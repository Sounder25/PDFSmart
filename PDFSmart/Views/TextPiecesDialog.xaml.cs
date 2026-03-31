using SmartPdfEditor.ViewModels;
using System.Windows;

namespace SmartPdfEditor.Views;

/// <summary>
/// Interaction logic for TextPiecesDialog.xaml
/// </summary>
public partial class TextPiecesDialog : Window
{
    public TextPiecesDialog()
    {
        InitializeComponent();
    }

    public TextPiecesDialog(TextPiecesViewModel viewModel) : this()
    {
        DataContext = viewModel;
        viewModel.RequestClose += (s, e) => Close();
    }
}
