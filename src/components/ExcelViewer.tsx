"use client";

import React from 'react';
import DataTable from 'react-data-table-component';
import * as XLSX from 'xlsx';
import { Button } from './ui/button';

interface ExcelViewerProps {
    data: any[];
    title?: string;
}

export const ExcelViewer: React.FC<ExcelViewerProps> = ({ data, title = "Data" }) => {

    const handleDownload = () => {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, title);
        XLSX.writeFile(wb, `${title}.xlsx`);
    };

    const columns = data.length > 0
        ? Object.keys(data[0]).map(key => ({
            name: key,
            selector: (row: any) => row[key],
            sortable: true,
        }))
        : [];

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">{title}</h3>
                <Button onClick={handleDownload} variant="outline" size="sm">Download XLSX</Button>
            </div>
            <div className="border rounded-md">
                <DataTable
                    columns={columns}
                    data={data}
                    pagination
                    responsive
                />
            </div>
        </div>
    );
};
