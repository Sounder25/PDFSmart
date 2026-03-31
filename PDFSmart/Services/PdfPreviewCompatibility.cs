using System;
using System.IO;
using System.Text.RegularExpressions;

namespace SmartPdfEditor.Services;

/// <summary>
/// Detects PDFs that are known to fail or render poorly in browser-based viewers.
/// </summary>
public static class PdfPreviewCompatibility
{
    public static bool IsLikelyAdobeDynamicForm(string pdfPath)
    {
        if (!File.Exists(pdfPath))
            return false;

        // USPTO's fillable forms (AIA/SB) are commonly Adobe-only dynamic forms.
        if (IsLikelyUsptoAdobeFormName(Path.GetFileNameWithoutExtension(pdfPath)))
            return true;

        try
        {
            using var stream = new FileStream(pdfPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
            return ContainsAsciiToken(stream, "/XFA") ||
                   (ContainsAsciiToken(stream, "Please wait") && ContainsAsciiToken(stream, "Adobe Reader")) ||
                   ContainsAsciiToken(stream, "If this message is not eventually replaced");
        }
        catch
        {
            return false;
        }
    }

    private static bool IsLikelyUsptoAdobeFormName(string? fileNameWithoutExtension)
    {
        if (string.IsNullOrWhiteSpace(fileNameWithoutExtension))
            return false;

        // Examples: aia0014, aia14, sb0008, sb08, AIA-14, SB-08, "aia0014 (1)"
        return Regex.IsMatch(
            fileNameWithoutExtension,
            @"\b(aia|sb)\s*[-_]*\s*0*\d{1,4}\b",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    }

    private static bool ContainsAsciiToken(Stream stream, string token)
    {
        stream.Position = 0;
        if (string.IsNullOrEmpty(token))
            return false;

        byte[] tokenBytes = System.Text.Encoding.ASCII.GetBytes(token);
        byte[] buffer = new byte[8192];
        int matched = 0;

        while (true)
        {
            int read = stream.Read(buffer, 0, buffer.Length);
            if (read <= 0)
                break;

            for (int i = 0; i < read; i++)
            {
                byte current = ToLowerAscii(buffer[i]);
                byte expected = ToLowerAscii(tokenBytes[matched]);

                if (current == expected)
                {
                    matched++;
                    if (matched == tokenBytes.Length)
                        return true;
                }
                else
                {
                    matched = current == ToLowerAscii(tokenBytes[0]) ? 1 : 0;
                }
            }
        }

        return false;
    }

    private static byte ToLowerAscii(byte value)
    {
        return value is >= (byte)'A' and <= (byte)'Z'
            ? (byte)(value + 32)
            : value;
    }
}
