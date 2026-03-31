using System;
using System.Collections.Generic;
using System.IO;
using PdfSharp.Fonts;

namespace SmartPdfEditor.Services;

/// <summary>
/// Resolves fonts from the Windows system fonts directory for PdfSharp 6.x.
/// Must be registered via GlobalFontSettings.FontResolver before any XFont is created.
/// </summary>
public class WindowsFontResolver : IFontResolver
{
    public string DefaultFontName => "Arial";

    // Maps "FamilyName Style#" face names to font file names in C:\Windows\Fonts
    private static readonly Dictionary<string, string> FaceToFile = new(StringComparer.OrdinalIgnoreCase)
    {
        { "Arial#",              "arial.ttf"   },
        { "Arial Bold#",         "arialbd.ttf" },
        { "Arial Italic#",       "ariali.ttf"  },
        { "Arial Bold Italic#",  "arialbi.ttf" },

        { "Times New Roman#",              "times.ttf"   },
        { "Times New Roman Bold#",         "timesbd.ttf" },
        { "Times New Roman Italic#",       "timesi.ttf"  },
        { "Times New Roman Bold Italic#",  "timesbi.ttf" },

        { "Courier New#",              "cour.ttf"   },
        { "Courier New Bold#",         "courbd.ttf" },
        { "Courier New Italic#",       "couri.ttf"  },
        { "Courier New Bold Italic#",  "courbi.ttf" },

        { "Verdana#",              "verdana.ttf"  },
        { "Verdana Bold#",         "verdanab.ttf" },
        { "Verdana Italic#",       "verdanai.ttf" },
        { "Verdana Bold Italic#",  "verdanaz.ttf" },
    };

    private static readonly string FontsFolder =
        Environment.GetFolderPath(Environment.SpecialFolder.Fonts);

    public FontResolverInfo? ResolveTypeface(string familyName, bool isBold, bool isItalic)
    {
        string suffix = (isBold, isItalic) switch
        {
            (true,  true)  => " Bold Italic",
            (true,  false) => " Bold",
            (false, true)  => " Italic",
            _              => "",
        };

        string faceName = $"{familyName}{suffix}#";

        // If we have a direct mapping, use it.
        if (FaceToFile.ContainsKey(faceName))
            return new FontResolverInfo(faceName);

        // Fall back to the plain variant of the family (simulating bold/italic).
        string plainFace = $"{familyName}#";
        if (FaceToFile.ContainsKey(plainFace))
            return new FontResolverInfo(plainFace, isBold, isItalic);

        // Fall back to Arial.
        return new FontResolverInfo("Arial#");
    }

    public byte[] GetFont(string faceName)
    {
        if (FaceToFile.TryGetValue(faceName, out string? fileName))
        {
            string path = Path.Combine(FontsFolder, fileName);
            if (File.Exists(path))
                return File.ReadAllBytes(path);
        }

        // Last-resort: return Arial regular.
        string arialPath = Path.Combine(FontsFolder, "arial.ttf");
        if (File.Exists(arialPath))
            return File.ReadAllBytes(arialPath);

        throw new FileNotFoundException(
            $"Font file not found for face '{faceName}' in {FontsFolder}.");
    }
}
