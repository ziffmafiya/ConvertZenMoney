document.addEventListener('DOMContentLoaded', () => {
    // Get references to HTML elements
    const csvFile = document.getElementById('csvFile');
    const convertBtn = document.getElementById('convertBtn');
    const filterDebtsCheckbox = document.getElementById('filterDebts');
    const filterMonthSelect = document.getElementById('filterMonth');
    const filterYearInput = document.getElementById('filterYear');

    // Add event listener to the convert button
    convertBtn.addEventListener('click', () => {
        // Check if a CSV file has been selected
        if (csvFile.files.length === 0) {
            alert('Please select a CSV file.');
            return;
        }

        const file = csvFile.files[0];
        const reader = new FileReader();

        // This function runs when the file is successfully loaded
        reader.onload = (e) => {
            const csvData = e.target.result;
            // Split CSV data into lines and filter out empty lines
            const lines = csvData.split('\n').filter(line => line.trim() !== '');

            // Define the expected headers for the Excel file
            const headers = [
                "date", "categoryName", "payee", "comment", "outcomeAccountName",
                "outcome", "outcomeCurrencyShortTitle", "incomeAccountName",
                "income", "incomeCurrencyShortTitle", "createdDate", "changedDate", "qrCode"
            ];

            const data = [];
            // Process each line of the CSV data
            lines.forEach(line => {
                const values = line.split(';'); // Split line by semicolon
                // Ensure the line has the correct number of values
                if (values.length === headers.length) {
                    let row = {};
                    // Map values to their respective headers
                    headers.forEach((header, index) => {
                        row[header] = values[index];
                    });
                    data.push(row);
                } else {
                    console.warn(`Skipping malformed line: ${line}`);
                }
            });

            let filteredData = data;

            // Helper function to normalize strings for robust comparison
            function normalize(str) {
                return (str ?? '')
                    .replace(/\u00A0/g, ' ')    // Replace non-breaking space with regular space
                    .trim()                     // Remove leading/trailing whitespace
                    .toLowerCase();             // Convert to lowercase
            }

            // Apply "Долги" (Debts) filter if the checkbox is checked
            if (filterDebtsCheckbox.checked) {
                filteredData = data.filter(row => {
                    const income = normalize(row.incomeAccountName);
                    const outcome = normalize(row.outcomeAccountName);

                    // Remove row if 'долги' is present in either incomeAccountName or outcomeAccountName
                    const hasDebt =
                        income.includes('долги') ||
                        outcome.includes('долги');

                    return !hasDebt; // Keep the row if it does NOT have debt
                });
            }

            // Apply month and year filter if either is selected
            const selectedMonth = filterMonthSelect.value;
            const selectedYear = filterYearInput.value;

            if (selectedMonth || selectedYear) {
                filteredData = filteredData.filter(row => {
                    // Extract year and month from the 'date' field (YYYY-MM-DD)
                    const dateParts = row.date.split('-');
                    const rowYear = dateParts[0];
                    const rowMonth = dateParts[1];

                    // Check if month matches (if selected) and year matches (if selected)
                    const matchMonth = !selectedMonth || rowMonth === selectedMonth;
                    const matchYear = !selectedYear || rowYear === selectedYear;

                    return matchMonth && matchYear; // Keep the row if both month and year match (or are not selected)
                });
            }

            // Alert if no valid data remains after filtering
            if (filteredData.length === 0) {
                alert('No valid data found in the CSV file or all data was filtered out.');
                return;
            }

            // Convert the filtered data to an Excel worksheet
            const ws = XLSX.utils.json_to_sheet(filteredData, { header: headers });
            // Create a new Excel workbook
            const wb = XLSX.utils.book_new();
            // Append the worksheet to the workbook with the name "Expenses"
            XLSX.utils.book_append_sheet(wb, ws, "Expenses");

            // Write the workbook to an Excel file and trigger download
            XLSX.writeFile(wb, "expenses.xlsx");
        };

        // This function runs if there's an error reading the file
        reader.onerror = () => {
            alert('Error reading file.');
        };

        // Read the selected file as text
        reader.readAsText(file);
    });
});
