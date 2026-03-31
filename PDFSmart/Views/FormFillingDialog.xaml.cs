using SmartPdfEditor.ViewModels;
using System.Windows;

namespace SmartPdfEditor.Views;

/// <summary>
/// Interaction logic for FormFillingDialog.xaml
/// </summary>
public partial class FormFillingDialog : Window
{
    public FormFillingDialog()
    {
        InitializeComponent();
    }

    public FormFillingDialog(FormFillingViewModel viewModel) : this()
    {
        DataContext = viewModel;
        viewModel.FormSaved += (s, e) => DialogResult = true;
        viewModel.FormCancelled += (s, e) => DialogResult = false;
    }
}
