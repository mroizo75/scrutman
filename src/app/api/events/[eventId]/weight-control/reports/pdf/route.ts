import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(
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
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const search = searchParams.get('search') || '';

    // Only authorized users can download reports
    if (!['WEIGHT_CONTROLLER', 'CLUBADMIN', 'SUPERADMIN'].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get event details
    const event = await prisma.event.findUnique({
      where: { id: resolvedParams.eventId },
      include: {
        club: {
          select: {
            name: true
          }
        }
      }
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if user has access to this event
    if (user.role === "CLUBADMIN" && event.clubId !== user.clubId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get weight control data (same as reports endpoint but filtered)
    let weightControlWhere: any = {
      eventId: resolvedParams.eventId,
      result: {
        in: ['PASS', 'UNDERWEIGHT', 'OVERWEIGHT', 'FAIL']
      }
    };

    // Apply filter
    if (filter === 'violations') {
      weightControlWhere.result = {
        in: ['UNDERWEIGHT', 'OVERWEIGHT']
      };
    } else if (filter !== 'all') {
      weightControlWhere.result = filter;
    }

    const weightControls = await prisma.weightControl.findMany({
      where: weightControlWhere,
      include: {
        controller: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        startNumber: 'asc'
      }
    });

    // Get related registrations
    const startNumbers = weightControls.map(wc => wc.startNumber);
    const registrations = await prisma.registration.findMany({
      where: {
        eventId: resolvedParams.eventId,
        startNumber: {
          in: startNumbers
        }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        class: {
          select: {
            id: true,
            name: true
          }
        },
        userVehicle: {
          select: {
            make: true,
            model: true,
            year: true,
            licensePlate: true,
            weight: true
          }
        },
        registrationVehicles: {
          include: {
            userVehicle: {
              select: {
                make: true,
                model: true,
                year: true,
                licensePlate: true,
                weight: true
              }
            }
          }
        },
        vehicle: {
          select: {
            make: true,
            model: true,
            year: true,
            licensePlate: true,
            weight: true
          }
        }
      }
    });

    // Get weight limits
    const weightLimits = await prisma.weightLimit.findMany({
      where: {
        eventId: resolvedParams.eventId
      }
    });

    // Build reports
    let reports = weightControls.map(weightControl => {
      const registration = registrations.find(r => r.startNumber === weightControl.startNumber);
      
      if (!registration) return null;

      // Vehicle info logic
      let vehicleInfo = null;
      if (registration.registrationVehicles && registration.registrationVehicles.length > 0) {
        vehicleInfo = registration.registrationVehicles[0].userVehicle;
      } else if (registration.vehicle) {
        vehicleInfo = {
          make: registration.vehicle.make,
          model: registration.vehicle.model,
          year: registration.vehicle.year,
          licensePlate: registration.vehicle.licensePlate,
          weight: registration.vehicle.weight
        };
      } else if (registration.userVehicle) {
        vehicleInfo = registration.userVehicle;
      }

      if (!vehicleInfo) return null;

      const weightLimit = weightLimits.find(wl => wl.classId === registration.class.id);

      return {
        startNumber: registration.startNumber,
        user: registration.user,
        class: registration.class,
        userVehicle: vehicleInfo,
        weightControl: {
          measuredWeight: weightControl.measuredWeight,
          result: weightControl.result,
          notes: weightControl.notes || '',
          controlledAt: weightControl.controlDate,
          controller: weightControl.controller,
          heat: weightControl.heat
        },
        weightLimit: weightLimit ? {
          minWeight: weightLimit.minWeight,
          maxWeight: weightLimit.maxWeight
        } : null
      };
    }).filter(Boolean);

    // Apply search filter
    if (search) {
      reports = reports.filter(r =>
        r && (
          r.startNumber.toString().includes(search) ||
          (r.user?.name && r.user.name.toLowerCase().includes(search.toLowerCase())) ||
          (r.userVehicle?.make && r.userVehicle.make.toLowerCase().includes(search.toLowerCase())) ||
          (r.userVehicle?.model && r.userVehicle.model.toLowerCase().includes(search.toLowerCase())) ||
          (r.userVehicle?.licensePlate && r.userVehicle.licensePlate.toLowerCase().includes(search.toLowerCase()))
        )
      );
    }

    // Generate PDF content (simplified HTML)
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Weight Control Report - ${event.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .event-info { margin-bottom: 20px; }
        .report-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .report-table th, .report-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .report-table th { background-color: #f2f2f2; font-weight: bold; }
        .violation { background-color: #fee; }
        .pass { background-color: #efe; }
        .violation-badge { background: #ef4444; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
        .pass-badge { background: #22c55e; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
        .summary { margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; }
        .violation-summary { color: #dc3545; font-weight: bold; }
        
        @media print {
            body { margin: 0; font-size: 12px; }
            .header { page-break-after: avoid; }
            .report-table { page-break-inside: avoid; }
            .summary { page-break-inside: avoid; }
        }
        
        @page {
            margin: 1cm;
            size: A4;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Weight Control Report</h1>
        <h2>${event.title}</h2>
        <p><strong>Club:</strong> ${event.club.name}</p>
        <p><strong>Date:</strong> ${new Date(event.startDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}</p>
        <p><strong>Location:</strong> ${event.location}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    </div>

    <div class="summary">
        <h3>Summary</h3>
        <p><strong>Total Reports:</strong> ${reports.length}</p>
        <p><strong>Passed:</strong> ${reports.filter(r => r && r.weightControl.result === 'PASS').length}</p>
        <p class="violation-summary"><strong>Weight Violations:</strong> ${reports.filter(r => r && ['UNDERWEIGHT', 'OVERWEIGHT'].includes(r.weightControl.result)).length}</p>
        ${filter === 'violations' ? '<p><em>This report shows only weight violations</em></p>' : ''}
        ${search ? `<p><em>Filtered by search: "${search}"</em></p>` : ''}
    </div>

    <table class="report-table">
        <thead>
            <tr>
                <th>Start #</th>
                <th>Driver</th>
                <th>Vehicle</th>
                <th>Class</th>
                <th>Heat</th>
                <th>Declared Weight</th>
                <th>Measured Weight</th>
                <th>Weight Limit</th>
                <th>Result</th>
                <th>Difference</th>
                <th>Controller</th>
                <th>Date/Time</th>
            </tr>
        </thead>
        <tbody>
            ${reports.filter(report => report !== null).map(report => `
                <tr class="${['UNDERWEIGHT', 'OVERWEIGHT'].includes(report.weightControl.result) ? 'violation' : 'pass'}">
                    <td><strong>#${report.startNumber}</strong></td>
                    <td>${report.user?.name || 'Unknown'}</td>
                    <td>${report.userVehicle?.make || 'Unknown'} ${report.userVehicle?.model || 'Vehicle'}<br>
                        <small>${report.userVehicle?.year || ''} • ${report.userVehicle?.licensePlate || 'N/A'}</small>
                    </td>
                    <td>${report.class?.name || 'Unknown'}</td>
                    <td>${report.weightControl?.heat || 'N/A'}</td>
                    <td>${report.userVehicle?.weight || 'N/A'} kg</td>
                    <td><strong>${report.weightControl.measuredWeight} kg</strong></td>
                    <td>${report.weightLimit ? `${report.weightLimit.minWeight} - ${report.weightLimit.maxWeight} kg` : 'No limit'}</td>
                    <td>
                        <span class="${report.weightControl.result === 'PASS' ? 'pass-badge' : 'violation-badge'}">
                            ${report.weightControl.result === 'PASS' ? 'PASS' : 
                              report.weightControl.result === 'UNDERWEIGHT' ? 'UNDERWEIGHT' :
                              report.weightControl.result === 'OVERWEIGHT' ? 'OVERWEIGHT' : report.weightControl.result}
                        </span>
                    </td>
                    <td>${report.userVehicle.weight && report.weightControl.measuredWeight ? 
                        (report.weightControl.measuredWeight - report.userVehicle.weight).toFixed(1) + ' kg' : 'N/A'}</td>
                    <td>${report.weightControl.controller.name}</td>
                    <td>${new Date(report.weightControl.controlledAt).toLocaleString()}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    ${reports.filter(r => r && ['UNDERWEIGHT', 'OVERWEIGHT'].includes(r.weightControl.result)).length > 0 ? `
    <div style="margin-top: 30px; padding: 15px; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 5px;">
        <h3 style="color: #dc3545;">⚠️ Weight Violations Detected</h3>
        <p>The vehicles listed above with UNDERWEIGHT or OVERWEIGHT results require attention according to event regulations.</p>
    </div>
    ` : ''}
</body>
</html>`;

    // Return as HTML that can be printed to PDF by the browser
    return new Response(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="weight-control-report-${event.title.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.html"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Error generating weight control PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
