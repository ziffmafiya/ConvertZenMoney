# CSV to Excel Converter

This is a simple web-based tool that allows you to upload a CSV file containing expense data and convert it into an Excel spreadsheet (`.xlsx` format). The tool also provides filtering options for "Долги" (Debts) and by month/year.

## Features

*   **CSV Upload**: Easily upload your CSV expense file.
*   **Semicolon Delimiter**: Automatically parses CSV data where values are separated by semicolons.
*   **"Долги" (Debts) Filter**: An option to exclude rows where `outcomeAccountName` or `incomeAccountName` fields contain "Долги" (case-insensitive and trimmed).
*   **Month and Year Filter**: Filter expenses by a specific month and/or year based on the `date` field (expected format: `YYYY-MM-DD`).
*   **Excel Download**: Converts the filtered data into an Excel spreadsheet (`expenses.xlsx`) and triggers a download.

## How to Use

1.  **Open the Application**: Open the `index.html` file in your web browser.
2.  **Select CSV File**: Click on the "Choose File" button and select your CSV expense file.
    *   **CSV Format**: Ensure your CSV file has data separated by semicolons (`;`) and includes the following headers in order: `date;categoryName;payee;comment;outcomeAccountName;outcome;outcomeCurrencyShortTitle;incomeAccountName;income;incomeCurrencyShortTitle;createdDate;changedDate;qrCode`.
3.  **Apply Filters (Optional)**:
    *   **Filter "Долги"**: Check the "Filter 'Долги' (Debts)" checkbox to exclude debt-related entries.
    *   **Filter by Month/Year**: Select a month from the dropdown and/or enter a year in the input field to filter expenses by date.
4.  **Convert to Excel**: Click the "Convert to Excel" button.
5.  **Download**: The converted Excel file (`expenses.xlsx`) will be downloaded to your computer.

## Project Structure

*   `index.html`: The main HTML file that provides the user interface.
*   `style.css`: Contains the CSS rules for styling the web page.
*   `script.js`: Contains the JavaScript logic for reading the CSV, applying filters, and generating the Excel file using the SheetJS library.
*   `README.md`: This file, providing information about the project.

## Technologies Used

*   HTML5
*   CSS3
*   JavaScript
*   [SheetJS (xlsx)](https://sheetjs.com/): A powerful library for reading and writing spreadsheet files.
