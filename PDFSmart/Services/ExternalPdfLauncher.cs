using System;
using System.Diagnostics;

namespace SmartPdfEditor.Services;

public static class ExternalPdfLauncher
{
    public static bool TryOpenInDefaultViewer(string filePath, out string? errorMessage)
    {
        errorMessage = null;

        try
        {
            var startInfo = new ProcessStartInfo
            {
                FileName = filePath,
                UseShellExecute = true
            };

            Process.Start(startInfo);
            return true;
        }
        catch (Exception ex)
        {
            errorMessage = ex.Message;
            return false;
        }
    }
}
