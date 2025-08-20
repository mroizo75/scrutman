import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string; reportId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get("user");
    
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = JSON.parse(userData.value);
    const resolvedParams = await params;

    // Only authorized users can download reports
    if (!['WEIGHT_CONTROLLER', 'CLUBADMIN', 'SUPERADMIN'].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the specific weight control record
    const weightControl = await prisma.weightControl.findUnique({
      where: { 
        id: resolvedParams.reportId 
      },
      include: {
        controller: {
          select: {
            name: true
          }
        }
      }
    });

    if (!weightControl || weightControl.eventId !== resolvedParams.eventId) {
      return NextResponse.json({ error: "Weight control record not found" }, { status: 404 });
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

    // Get registration details for this start number
    const registration = await prisma.registration.findFirst({
      where: {
        eventId: resolvedParams.eventId,
        startNumber: weightControl.startNumber
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

    if (!registration) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    // Determine vehicle info (same logic as before)
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

    // Provide default vehicle info if none found
    if (!vehicleInfo) {
      vehicleInfo = {
        make: 'Unknown',
        model: 'Vehicle',
        year: null,
        licensePlate: null,
        weight: null
      };
    }

    // Get weight limit for this class
    const weightLimit = await prisma.weightLimit.findFirst({
      where: {
        eventId: resolvedParams.eventId,
        classId: registration.class.id
      }
    });

    // Generate individual PDF content
    const getResultText = (result: string) => {
      switch (result) {
        case 'PASS': return 'PASSED';
        case 'UNDERWEIGHT': return 'UNDERWEIGHT';
        case 'OVERWEIGHT': return 'OVERWEIGHT';
        default: return result;
      }
    };

    const getResultColor = (result: string) => {
      switch (result) {
        case 'PASS': return '#22c55e';
        case 'UNDERWEIGHT': return '#ef4444';
        case 'OVERWEIGHT': return '#ef4444';
        default: return '#f59e0b';
      }
    };

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Weight Control Report - Start #${weightControl.startNumber}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            line-height: 1.4;
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 3px solid #333; 
            padding-bottom: 20px; 
        }
        .report-box {
            border: 2px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            background-color: #f9f9f9;
        }
        .violation-box {
            border-color: #ef4444;
            background-color: #fef2f2;
        }
        .pass-box {
            border-color: #22c55e;
            background-color: #f0fdf4;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
        }
        .info-section {
            background: white;
            padding: 15px;
            border-radius: 5px;
            border: 1px solid #e5e7eb;
        }
        .result-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 14px;
            text-align: center;
            color: white;
            margin: 10px 0;
        }
        .weight-comparison {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
            border-left: 4px solid #007bff;
        }
        .signature-section {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
        }
        .signature-box {
            border: 1px solid #ddd;
            height: 60px;
            margin-top: 10px;
        }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .text-right { text-align: right; }
        .weight-violation { color: #dc3545; font-weight: bold; }
        .weight-pass { color: #28a745; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>WEIGHT CONTROL REPORT</h1>
        <h2>${event.title}</h2>
        <p><strong>Event Date:</strong> ${new Date(event.startDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}</p>
        <p><strong>Location:</strong> ${event.location}</p>
        <p><strong>Club:</strong> ${event.club.name}</p>
    </div>

    <div class="report-box ${['UNDERWEIGHT', 'OVERWEIGHT'].includes(weightControl.result) ? 'violation-box' : 'pass-box'}">
        <h2>Start Number: #${weightControl.startNumber}</h2>
        
        <div class="info-grid">
            <div class="info-section">
                <h3>Driver Information</h3>
                <p><strong>Name:</strong> ${registration.user.name}</p>
                <p><strong>Email:</strong> ${registration.user.email}</p>
                <p><strong>Phone:</strong> ${registration.user.phone || 'N/A'}</p>
                <p><strong>Class:</strong> ${registration.class.name}</p>
            </div>

            <div class="info-section">
                <h3>Vehicle Information</h3>
                <p><strong>Make/Model:</strong> ${vehicleInfo.make} ${vehicleInfo.model}</p>
                <p><strong>Year:</strong> ${vehicleInfo.year || 'N/A'}</p>
                <p><strong>License Plate:</strong> ${vehicleInfo.licensePlate || 'N/A'}</p>
                <p><strong>Declared Weight:</strong> ${vehicleInfo.weight || 'N/A'} kg</p>
            </div>
        </div>

        <div class="weight-comparison">
            <h3>Weight Control Results</h3>
            <table>
                <tr>
                    <th>Heat</th>
                    <th>Declared Weight</th>
                    <th>Measured Weight</th>
                    <th>Weight Limit</th>
                    <th>Difference</th>
                    <th>Result</th>
                </tr>
                <tr>
                    <td><strong>${weightControl.heat}</strong></td>
                    <td>${vehicleInfo.weight || 'N/A'} kg</td>
                    <td><strong>${weightControl.measuredWeight} kg</strong></td>
                    <td>${weightLimit ? `${weightLimit.minWeight} - ${weightLimit.maxWeight} kg` : 'No limit set'}</td>
                    <td class="${vehicleInfo.weight && weightControl.measuredWeight && vehicleInfo.weight !== weightControl.measuredWeight ? 
                        (weightControl.measuredWeight > vehicleInfo.weight ? 'weight-violation' : 'weight-pass') : ''
                    }">
                        ${vehicleInfo.weight && weightControl.measuredWeight ? (weightControl.measuredWeight - vehicleInfo.weight).toFixed(1) + ' kg' : 'N/A'}
                    </td>
                    <td>
                        <span class="result-badge" style="background-color: ${getResultColor(weightControl.result)}">
                            ${getResultText(weightControl.result)}
                        </span>
                    </td>
                </tr>
            </table>
        </div>

        ${weightControl.notes ? `
        <div class="info-section">
            <h3>Controller Notes</h3>
            <p>${weightControl.notes}</p>
        </div>
        ` : ''}

        <div class="info-section">
            <h3>Control Information</h3>
            <p><strong>Controller:</strong> ${weightControl.controller.name}</p>
            <p><strong>Control Date/Time:</strong> ${new Date(weightControl.controlDate).toLocaleString()}</p>
            <p><strong>Report Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>

        ${['UNDERWEIGHT', 'OVERWEIGHT'].includes(weightControl.result) ? `
        <div style="background-color: #fef2f2; border: 2px solid #fecaca; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <h3 style="color: #dc3545; margin-top: 0;">⚠️ WEIGHT VIOLATION DETECTED</h3>
            <p style="color: #dc3545; font-weight: bold;">
                This vehicle is ${weightControl.result.toLowerCase()} according to the event regulations and requires attention.
            </p>
        </div>
        ` : `
        <div style="background-color: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <h3 style="color: #16a34a; margin-top: 0;">✅ WEIGHT CONTROL PASSED</h3>
            <p style="color: #16a34a; font-weight: bold;">
                This vehicle meets the weight requirements for the specified class.
            </p>
        </div>
        `}
    </div>

    <div class="signature-section">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
            <div>
                <p><strong>Controller Signature:</strong></p>
                <div class="signature-box"></div>
                <p style="text-align: center; margin-top: 5px; font-size: 12px;">
                    ${weightControl.controller.name}
                </p>
            </div>
            <div>
                <p><strong>Driver Acknowledgment:</strong></p>
                <div class="signature-box"></div>
                <p style="text-align: center; margin-top: 5px; font-size: 12px;">
                    ${registration.user.name}
                </p>
            </div>
        </div>
    </div>

    <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #666;">
        <p>This is an official weight control report generated by ScrutMan App</p>
        <p>Report ID: ${weightControl.id} | Generated: ${new Date().toISOString()}</p>
    </div>
</body>
</html>`;

    // Return as HTML that can be printed to PDF by the browser
    return new Response(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="weight-report-${weightControl.startNumber}-${weightControl.heat}-${new Date().toISOString().split('T')[0]}.html"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Error generating individual weight control PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
