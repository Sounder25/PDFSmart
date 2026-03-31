namespace SmartPdfEditor.Models;

/// <summary>
/// Represents a form field in a PDF.
/// </summary>
public class FormField
{
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // Text, CheckBox, Radio, ComboBox
    public string? CurrentValue { get; set; }
    public List<string>? Options { get; set; } // For ComboBox/Radio
    public bool IsReadOnly { get; set; }
}
