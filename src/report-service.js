// reportService.js
const ReportService = {
  /**
   * Generate and download a PDF report for TruffleHog findings
   * @param {Object} data - The data needed to generate the report
   */
  generatePDFReport(data, source) {
    try {
      // Check if jsPDF is loaded
      if (typeof jspdf === "undefined") {
        console.error("jsPDF is not loaded");
        alert("Could not generate PDF. Required libraries are not loaded.");
        return;
      }

      // Create a new jsPDF instance
      const { jsPDF } = jspdf;
      const doc = new jsPDF();

      // Set document properties
      doc.setProperties({
        title: "TruffleHog Security Findings Report",
        subject: "Security Findings",
        author: "Derek Sneddon",
        creator: "TruffleShow App (DDM Edition)",
      });

      // Document dimensions
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      // Add report title
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      const title = "TruffleHog Security Findings Report";
      doc.text(title, pageWidth / 2, y, { align: "center" });

      // Add generation date
      y += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const reportDate = `Generated on ${new Date().toLocaleString()} with TruffleShow App`;
      doc.text(reportDate, pageWidth / 2, y, { align: "center" });

      // Add horizontal line
      y += 8;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 15;

      // Add summary section title
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Summary", margin, y);
      y += 10;

      // Create summary cards using tables
      const summaryData = [
        [
          {
            title: "Total Findings",
            value: data.stats.totalFindings,
            color: null,
          },
          {
            title: "Verified Credentials",
            value: data.stats.verifiedCount,
            color: [0, 128, 0],
          }, // Green
        ],
        [
          {
            title: "Failed Verification",
            value: data.stats.failedCount,
            color: [220, 0, 0],
          }, // Red
          {
            title: "Not Verified",
            value: data.stats.notVerifiedCount,
            color: [240, 165, 0],
          }, // Orange
        ],
        [
          {
            title: "Unique Detectors",
            value: data.stats.uniqueDetectors,
            color: null,
          },
          {
            title: "Unique Repositories",
            value: data.stats.uniqueRepositories,
            color: null,
          },
        ],
      ];

      // Generate summary cards
      for (const row of summaryData) {
        const cardWidth = contentWidth / 2 - 5;

        // Draw two cards per row
        for (let i = 0; i < row.length; i++) {
          const card = row[i];
          const x = margin + i * (cardWidth + 10);

          // Draw card background
          doc.setFillColor(249, 249, 249);
          doc.setDrawColor(238, 238, 238);
          doc.roundedRect(x, y, cardWidth, 25, 2, 2, "FD");

          // Card title
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.setFont("helvetica", "normal");
          doc.text(card.title, x + 5, y + 8);

          // Card value
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          if (card.color) {
            doc.setTextColor(card.color[0], card.color[1], card.color[2]);
          } else {
            doc.setTextColor(0, 0, 0);
          }
          doc.text(card.value.toString(), x + 5, y + 20);
        }

        y += 30;
      }

      // Add findings section
      y += 10;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Detailed Findings", margin, y);
      y += 10;

      // Process each finding
      for (const finding of data.findings) {
        // Check if we need a new page
        // Adjust this threshold if needed based on your content
        if (y > doc.internal.pageSize.getHeight() - 70) {
          doc.addPage();
          y = margin;
        }

        // Get status colors
        let statusColor = [0, 0, 0];
        let statusBgColor = [249, 249, 249];
        let statusText = "Not Verified";

        if (finding.Verified) {
          statusColor = [0, 128, 0]; // Green
          statusBgColor = [220, 242, 231]; // Light green
          statusText = "Verified";
        } else if (finding.VerificationError) {
          statusColor = [220, 0, 0]; // Red
          statusBgColor = [254, 226, 226]; // Light red
          statusText = "Failed";
        } else {
          statusColor = [240, 165, 0]; // Orange
          statusBgColor = [254, 243, 199]; // Light orange
          statusText = "Not Verified";
        }

        // Draw finding card
        doc.setFillColor(243, 244, 246);
        doc.setDrawColor(229, 231, 235);
        // This rectangle height might need to be dynamic based on wrapped text, or
        // you might need to draw the rectangle *after* calculating text height.
        // For now, we'll give it a generous height or calculate it later.
        const findingCardStartY = y; // Remember starting Y for this card
        doc.roundedRect(margin, y, contentWidth, 15, 2, 2, "FD"); // Initial rect, height might change

        // Draw header with finding detector name
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(
          this.truncateText(finding.DetectorName || "Unknown Detector", 30),
          margin + 5,
          y + 10,
        );

        // Draw status badge
        const statusWidth = doc.getTextWidth(statusText) + 10;
        const statusX = pageWidth - margin - statusWidth - 5;

        doc.setFillColor(statusBgColor[0], statusBgColor[1], statusBgColor[2]);
        doc.roundedRect(statusX, y + 4, statusWidth, 8, 4, 4, "F");

        doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
        doc.setFontSize(8);
        doc.text(statusText, statusX + 5, y + 9);

        // Draw finding details
        y += 20;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);

        // Define a common starting X for values to align them
        const valueStartX = margin + 60;
        const availableWidthForText = contentWidth - 60; // contentWidth - (valueStartX - margin)

        const lineHeight = doc.getLineHeight() / doc.internal.scaleFactor; // Get current line height

        // Helper function to handle text and update Y
        const addWrappedText = (label, textContent, yPos) => {
            doc.setFont("helvetica", "bold");
            doc.text(label, margin, yPos);
            doc.setFont("helvetica", "normal");
            const textLines = doc.text(textContent, valueStartX, yPos, { maxWidth: availableWidthForText });
            // Ensure textLines is an array, then calculate height
            const numLines = Array.isArray(textLines) ? textLines.length : 1;
            return yPos + numLines * lineHeight + 10; // Add spacing
        };

        // Repository
        const repo = finding.SourceMetadata?.Data?.[source]?.repository
          ? finding.SourceMetadata.Data[source].repository
              .replace("https://github.com/", "")
              .replace(".git", "")
          : "N/A";
        y = addWrappedText("Repository:", repo, y);


        // File
        const file = finding.SourceMetadata?.Data?.[source]?.file;
        y = addWrappedText("File:", file, y);

        // Link
        const link = finding.SourceMetadata?.Data?.[source]?.link || "N/A";
        y = addWrappedText("Link:", link, y);

        // Credential
        const credential = finding.Raw;
        y = addWrappedText("Credential:", credential, y);

        // Description - The primary focus for wrapping
        const description = finding.DetectorDescription;
        y = addWrappedText("Description:", description, y);


        // Add spacing between findings
        y += 15;
      }

      // Save the PDF
      doc.save("truffleshow-report.pdf");

      return true;
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("An error occurred while generating the PDF. Please try again.");
      return false;
    }
  },
  truncateText(text, maxLength = 30) {
    if (!text) return "N/A";
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  },
};

// Export the service
window.ReportService = ReportService;