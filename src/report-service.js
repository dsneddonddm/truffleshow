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

      // Dark theme DDM colors (pulled from logo)
      const primaryBlue = [68, 130, 205]; // #4482cd
      const accentOrange = [255, 120, 28]; // #ff781c
      const accentGreen = [98, 184, 58]; // #62b83a
      const textColor = [220, 220, 220]; // Light gray for text
      const darkBg = [30, 30, 30]; // Dark background
      const mediumDarkBg = [50, 50, 50]; // Slightly lighter dark background
      const borderColor = [80, 80, 80]; // Border color

      // Document dimensions
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;

      let y = margin;
      doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      doc.setProperties({
        title: "TruffleHog Security Findings Report",
        subject: "Security Findings",
        author: "Derek Sneddon",
        creator: "TruffleShow App (DDM Edition)",
      });

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
      doc.text("TruffleHog Security Findings Report", pageWidth / 2, y, { align: "center" });
      y += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(`Generated on ${new Date().toLocaleString()} with TruffleShow App (DDM Edition)`, pageWidth / 2, y, { align: "center" });
      y += 8;
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.line(margin, y, pageWidth - margin, y);
      y += 15;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(accentOrange[0], accentOrange[1], accentOrange[2]);
      doc.text("Summary", margin, y);
      y += 10;

      const summaryData = [
        [{ title: "Total Findings", value: data.stats.totalFindings, color: null },
         { title: "Verified Credentials", value: data.stats.verifiedCount, color: accentGreen }],
        [{ title: "Failed Verification", value: data.stats.failedCount, color: [220, 0, 0] },
         { title: "Not Verified", value: data.stats.notVerifiedCount, color: accentOrange }],
        [{ title: "Unique Detectors", value: data.stats.uniqueDetectors, color: null },
         { title: "Unique Repositories", value: data.stats.uniqueRepositories, color: null }],
      ];

      for (const row of summaryData) {
        const cardWidth = contentWidth / 2 - 5;
        for (let i = 0; i < row.length; i++) {
          const card = row[i];
          const x = margin + i * (cardWidth + 10);
          doc.setFillColor(mediumDarkBg[0], mediumDarkBg[1], mediumDarkBg[2]);
          doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
          doc.roundedRect(x, y, cardWidth, 25, 2, 2, "FD");
          doc.setFontSize(9);
          doc.setTextColor(textColor[0], textColor[1], textColor[2]);
          doc.setFont("helvetica", "normal");
          doc.text(card.title, x + 5, y + 8);
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(card.color ? card.color[0] : primaryBlue[0], card.color ? card.color[1] : primaryBlue[1], card.color ? card.color[2] : primaryBlue[2]);
          doc.text(card.value.toString(), x + 5, y + 20);
        }
        y += 30;
      }

      const summaryContentPageCount = doc.internal.getNumberOfPages(); // Should be 1
      const summaryLastY = y;
      doc.deletePage(1); // Clear the initial page to rebuild later

      // --- Group findings by repository ---
      const findingsByRepo = data.findings.reduce((acc, finding) => {
        const repo = finding.SourceMetadata?.Data?.[source]?.repository || "Unknown Repository";
        if (!acc[repo]) {
          acc[repo] = [];
        }
        acc[repo].push(finding);
        return acc;
      }, {});

      const tempDoc = new jsPDF();
      let tempY = margin;
      const repoTempPageMap = {}; // To store {repoName: tempPageNumber}

      const lineHeight = tempDoc.getLineHeight() / tempDoc.internal.scaleFactor;
      // Helper function to add wrapped text (for non-link fields)
      const addWrappedTextTemp = (docInstance, label, textContent, yPos, valueStartX, availableWidthForText) => {
          docInstance.setFont("helvetica", "bold");
          docInstance.text(label, margin, yPos);
          docInstance.setFont("helvetica", "normal");
          const textLines = docInstance.text(textContent, valueStartX, yPos, { maxWidth: availableWidthForText });
          const numLines = Array.isArray(textLines) ? textLines.length : 1;
          return yPos + numLines * lineHeight + 10;
      };

      // Ensure tempDoc has a page
      tempDoc.addPage();
      tempDoc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
      tempDoc.rect(0, 0, pageWidth, pageHeight, 'F');


      for (const repoName in findingsByRepo) {
        if (tempY > pageHeight - 40) {
          tempDoc.addPage();
          tempDoc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
          tempDoc.rect(0, 0, pageWidth, pageHeight, 'F');
          tempY = margin;
        }

        // Record the page number where this repository starts in the *temporary* document
        repoTempPageMap[repoName] = tempDoc.internal.getNumberOfPages();

        tempDoc.setFontSize(16);
        tempDoc.setFont("helvetica", "bold");
        tempDoc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
        tempDoc.text(`Repository: ${this.truncateText(repoName.replace("https://github.com/", "").replace(".git", ""), 50)}`, margin, tempY);
        tempY += 8;
        tempDoc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        tempDoc.line(margin, tempY, pageWidth - margin, tempY);
        tempY += 15;

        for (const finding of findingsByRepo[repoName]) {
          if (tempY > pageHeight - 70) {
            tempDoc.addPage();
            tempDoc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
            tempDoc.rect(0, 0, pageWidth, pageHeight, 'F');
            tempY = margin;
            tempDoc.setFontSize(16);
            tempDoc.setFont("helvetica", "bold");
            tempDoc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
            tempDoc.text(`Repository: ${this.truncateText(repoName.replace("https://github.com/", "").replace(".git", ""), 50)}`, margin, tempY);
            tempY += 8;
            tempDoc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
            tempDoc.line(margin, tempY, pageWidth - margin, tempY);
            tempY += 15;
          }

          let statusColor = accentOrange;
          let statusBgColor = [90, 70, 30];
          let statusText = "Not Verified";
          if (finding.Verified) { statusColor = accentGreen; statusBgColor = [40, 80, 20]; statusText = "Verified"; }
          else if (finding.VerificationError) { statusColor = [220, 0, 0]; statusBgColor = [90, 30, 30]; statusText = "Failed"; }

          tempDoc.setFillColor(mediumDarkBg[0], mediumDarkBg[1], mediumDarkBg[2]);
          tempDoc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
          tempDoc.roundedRect(margin, tempY, contentWidth, 15, 2, 2, "FD");

          tempDoc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
          tempDoc.setFontSize(12);
          tempDoc.setFont("helvetica", "bold");
          tempDoc.text(this.truncateText(finding.DetectorName || "Unknown Detector", 30), margin + 5, tempY + 10);

          const statusWidth = tempDoc.getTextWidth(statusText) + 10;
          const statusX = pageWidth - margin - statusWidth - 5;
          tempDoc.setFillColor(statusBgColor[0], statusBgColor[1], statusBgColor[2]);
          tempDoc.roundedRect(statusX, tempY + 4, statusWidth, 8, 4, 4, "F");
          tempDoc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
          tempDoc.setFontSize(8);
          tempDoc.text(statusText, statusX + 5, tempY + 9);

          tempY += 20;
          tempDoc.setTextColor(textColor[0], textColor[1], textColor[2]);
          tempDoc.setFontSize(10);

          const valueStartX = margin + 60;
          const availableWidthForText = contentWidth - 60;

          tempY = addWrappedTextTemp(tempDoc, "File:", finding.SourceMetadata?.Data?.[source]?.file, tempY, valueStartX, availableWidthForText);

          const linkText = finding.SourceMetadata?.Data?.[source]?.link || "N/A";
          // console.log("Link for PDF:", linkText);

          tempDoc.setFont("helvetica", "bold");
          tempDoc.text("Link:", margin, tempY);
          tempDoc.setFont("helvetica", "normal");

          if (linkText !== "N/A") {
            const linkAvailableWidth = contentWidth - (valueStartX - margin);
            const wrappedLinkText = tempDoc.splitTextToSize(linkText, linkAvailableWidth);
            const linkNumLines = wrappedLinkText.length;

            tempDoc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]); // Make link text blue

            const linkRectYStart = tempY - lineHeight * 0.2; // Start slightly above the first line of text
            let maxTextWidth = 0;

            // Draw the text for each line
            for (let i = 0; i < linkNumLines; i++) {
                const currentLineY = tempY + (i * lineHeight);
                const currentLineText = wrappedLinkText[i];
                tempDoc.text(currentLineText, valueStartX, currentLineY); // Draw the text
                const currentTextWidth = tempDoc.getTextWidth(currentLineText);
                if (currentTextWidth > maxTextWidth) {
                  maxTextWidth = currentTextWidth; // Keep track of the widest line
                }
            }

            // Create a single large link annotation covering the entire wrapped text area
            const linkRectHeight = (linkNumLines * lineHeight) + (lineHeight * 0.4); // Height to cover all lines with some padding
            tempDoc.link(valueStartX, linkRectYStart, maxTextWidth, linkRectHeight, { url: linkText });

            tempDoc.setTextColor(textColor[0], textColor[1], textColor[2]); // Reset text color
            tempY += (linkNumLines * lineHeight) + 10; // Adjust Y based on wrapped lines
          } else {
            tempDoc.text(linkText, valueStartX, tempY);
            tempY += lineHeight + 10; // Adjust Y position for single line "N/A"
          }

          tempY = addWrappedTextTemp(tempDoc, "Credential:", finding.Raw, tempY, valueStartX, availableWidthForText);
          tempY = addWrappedTextTemp(tempDoc, "Description:", finding.DetectorDescription, tempY, valueStartX, availableWidthForText);
          tempY += 15;
        }
        tempY += 20;
      }
      const detailedFindingsPageCount = tempDoc.internal.getNumberOfPages();
      const detailedFindingsPages = tempDoc.internal.pages.slice(1); // Get all pages excluding the dummy first page

      // Determine how many pages the TOC will take
      let tocPreviewY = margin;
      const tocLineHeight = 10;
      let tempTocPages = 1; // Start with 1 page for the TOC header

      // Simulate drawing TOC to count pages
      tocPreviewY += 15; // For title
      tocPreviewY += 8; // For line
      tocPreviewY += 20; // For spacing

      for (const repoName in findingsByRepo) { // Use findingsByRepo to iterate unique repos
        tocPreviewY += tocLineHeight;
        if (tocPreviewY > pageHeight - margin) {
            tempTocPages++;
            tocPreviewY = margin; // Reset y for new page
        }
      }
      const tocPagesCount = tempTocPages;

      // Add summary page
      doc.addPage();
      doc.setPage(1); // Set to the first page
      y = margin; // Reset Y for actual drawing
      doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
      doc.text("TruffleHog Security Findings Report", pageWidth / 2, y, { align: "center" });
      y += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(`Generated on ${new Date().toLocaleString()} with TruffleShow App (DDM Edition)`, pageWidth / 2, y, { align: "center" });
      y += 8;
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.line(margin, y, pageWidth - margin, y);
      y += 15;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(accentOrange[0], accentOrange[1], accentOrange[2]);
      doc.text("Summary", margin, y);
      y += 10;

      for (const row of summaryData) {
        const cardWidth = contentWidth / 2 - 5;
        for (let i = 0; i < row.length; i++) {
          const card = row[i];
          const x = margin + i * (cardWidth + 10);
          doc.setFillColor(mediumDarkBg[0], mediumDarkBg[1], mediumDarkBg[2]);
          doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
          doc.roundedRect(x, y, cardWidth, 25, 2, 2, "FD");
          doc.setFontSize(9);
          doc.setTextColor(textColor[0], textColor[1], textColor[2]);
          doc.setFont("helvetica", "normal");
          doc.text(card.title, x + 5, y + 8);
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(card.color ? card.color[0] : primaryBlue[0], card.color ? card.color[1] : primaryBlue[1], card.color ? card.color[2] : primaryBlue[2]);
          doc.text(card.value.toString(), x + 5, y + 20);
        }
        y += 30;
      }
      if (y > pageHeight - margin) { // If summary pushed beyond current page, add new page for TOC
          doc.addPage();
          doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
          doc.rect(0, 0, pageWidth, pageHeight, 'F');
      }

      // Add TOC pages
      let tocCurrentY = margin;
      doc.addPage(); // Start TOC on a new page
      doc.setPage(doc.internal.getNumberOfPages());
      doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
      doc.text("Table of Contents", pageWidth / 2, tocCurrentY, { align: "center" });
      tocCurrentY += 15;

      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.line(margin, tocCurrentY, pageWidth - margin, tocCurrentY);
      tocCurrentY += 20;

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);

      // Calculate the page offset: 1 (for summary page) + tocPagesCount
      const pageOffset = 1 + tocPagesCount;

      for (const repoName in findingsByRepo) {
        // Adjust the page number using the offset
        const finalRepoPageNumber = repoTempPageMap[repoName] + pageOffset;
        const truncatedRepoName = this.truncateText(repoName.replace("https://github.com/", "").replace(".git", ""), 60);

        doc.textWithLink(
          `${truncatedRepoName} -> Page ${finalRepoPageNumber}`,
          margin,
          tocCurrentY,
          { pageNumber: finalRepoPageNumber }
        );
        tocCurrentY += tocLineHeight;

        if (tocCurrentY > pageHeight - margin) {
            doc.addPage();
            doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            tocCurrentY = margin;
            doc.setFontSize(12);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        }
      }

      // Add detailed findings pages (from tempDoc) to the main document
      detailedFindingsPages.forEach(page => {
        doc.addPage(page.width, page.height); 
        const currentPageIndex = doc.internal.getNumberOfPages();
        doc.internal.pages[currentPageIndex] = page;
      });


      // Page numbering
      const finalTotalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= finalTotalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        const pageNumberText = `Page ${i} of ${finalTotalPages}`;
        const textWidth = doc.getTextWidth(pageNumberText);
        doc.text(pageNumberText, pageWidth - margin - textWidth, margin / 2 + 5);
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