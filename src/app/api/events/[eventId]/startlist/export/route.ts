import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    const resolvedParams = await params;

    // Only club admins and superadmins can export start lists
    if (user.role !== "CLUBADMIN" && user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { format, participants } = await request.json();

    if (format === 'csv') {
      // Generate CSV
      const headers = ['Start Number', 'Driver Name', 'Class', 'Vehicle', 'License Plate', 'Status'];
      const csvContent = [
        headers.join(','),
        ...participants.map((p: any) => [
          p.startNumber,
          `"${p.name}"`,
          `"${p.class}"`,
          `"${p.vehicle}"`,
          `"${p.licensePlate}"`,
          `"${p.status}"`
        ].join(','))
      ].join('\n');

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="startlist.csv"'
        }
      });
    }

    if (format === 'pdf') {
      // For PDF, we'll return a simple HTML that can be printed
      // In a real implementation, you might use a PDF library like puppeteer
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Start List</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            h1 { color: #333; }
            .header { margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Start List</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Start #</th>
                <th>Driver Name</th>
                <th>Class</th>
                <th>Vehicle</th>
                <th>License Plate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${participants.map((p: any) => `
                <tr>
                  <td>${p.startNumber}</td>
                  <td>${p.name}</td>
                  <td>${p.class}</td>
                  <td>${p.vehicle}</td>
                  <td>${p.licensePlate}</td>
                  <td>${p.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
        </html>
      `;

      return new Response(htmlContent, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': 'attachment; filename="startlist.html"'
        }
      });
    }

    return NextResponse.json({ error: "Invalid format" }, { status: 400 });

  } catch (error) {
    console.error('Error exporting start list:', error);
    return NextResponse.json(
      { error: 'Failed to export start list' },
      { status: 500 }
    );
  }
}
