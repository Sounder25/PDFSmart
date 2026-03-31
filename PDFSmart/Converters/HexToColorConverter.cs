using System;
using System.Globalization;
using System.Windows.Data;
using System.Windows.Media;

namespace SmartPdfEditor.Converters;

/// <summary>
/// Converts hex color string to Color for WPF binding.
/// </summary>
public class HexToColorConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is string hexColor)
        {
            try
            {
                // Remove # if present
                hexColor = hexColor.TrimStart('#');

                if (hexColor.Length == 6)
                {
                    // RGB format
                    byte r = System.Convert.ToByte(hexColor.Substring(0, 2), 16);
                    byte g = System.Convert.ToByte(hexColor.Substring(2, 2), 16);
                    byte b = System.Convert.ToByte(hexColor.Substring(4, 2), 16);
                    return Color.FromRgb(r, g, b);
                }
                else if (hexColor.Length == 8)
                {
                    // ARGB format
                    byte a = System.Convert.ToByte(hexColor.Substring(0, 2), 16);
                    byte r = System.Convert.ToByte(hexColor.Substring(2, 2), 16);
                    byte g = System.Convert.ToByte(hexColor.Substring(4, 2), 16);
                    byte b = System.Convert.ToByte(hexColor.Substring(6, 2), 16);
                    return Color.FromArgb(a, r, g, b);
                }
            }
            catch
            {
                // Return black on error
                return Colors.Black;
            }
        }

        return Colors.Black;
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is Color color)
        {
            return $"#{color.R:X2}{color.G:X2}{color.B:X2}";
        }

        return "#000000";
    }
}
