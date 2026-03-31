using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using SmartPdfEditor.Models;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Windows;

namespace SmartPdfEditor.ViewModels;

public partial class FormFillingViewModel : ObservableObject
{
    [ObservableProperty]
    private ObservableCollection<FormFieldViewModel> formFields = new();

    [ObservableProperty]
    private string pdfPath = string.Empty;

    public event EventHandler<Dictionary<string, string>>? FormSaved;
    public event EventHandler? FormCancelled;

    public void LoadFields(List<FormField> fields)
    {
        FormFields.Clear();
        foreach (var field in fields)
        {
            FormFields.Add(new FormFieldViewModel(field));
        }
    }

    [RelayCommand]
    private void SaveForm()
    {
        var values = FormFields.ToDictionary(
            f => f.FieldName,
            f => f.UserValue ?? string.Empty
        );
        FormSaved?.Invoke(this, values);
    }

    [RelayCommand]
    private void Cancel()
    {
        FormCancelled?.Invoke(this, EventArgs.Empty);
    }
}

public partial class FormFieldViewModel : ObservableObject
{
    [ObservableProperty]
    private string fieldName = string.Empty;

    [ObservableProperty]
    private string fieldType = string.Empty;

    [ObservableProperty]
    private string? currentValue;

    [ObservableProperty]
    private string? userValue;

    [ObservableProperty]
    private bool isReadOnly;

    public FormFieldViewModel(FormField field)
    {
        FieldName = field.Name;
        FieldType = field.Type;
        CurrentValue = field.CurrentValue;
        UserValue = field.CurrentValue;
        IsReadOnly = field.IsReadOnly;
    }
}
