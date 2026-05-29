import type { ComponentType } from 'react';
export type { ComponentType };

export type OutputFormat = 'xlsx' | 'csv';
export type TrimOption = 'all' | 'left' | 'right' | 'none';
export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type Theme = 'light' | 'dark';
export type CellValue = string | number | null;

export interface FileData {
  file: File;
  headers: string[];
  rows: CellValue[][];
  rowCount: number;
}

export interface CompareMapping {
  sourceCol: string;
  lookupCol: string;
  isKey: boolean;
}

export interface CompareOptions {
  mappings: CompareMapping[];
  caseSensitive: boolean;
  trim: TrimOption;
  addChangeReason: boolean;
}

export interface CompareResult {
  aoa: CellValue[][];
  counts: { new: number; changed: number };
  total: number;
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export type MappingSource =
  | { type: 'column'; header: string }
  | { type: 'fixed'; value: string }
  | { type: 'blank' };

export type MappingTransform = 'none' | 'uppercase' | 'lowercase' | 'trim' | 'round';

export interface ColumnMapping {
  outputHeader: string;
  source: MappingSource;
  transform: MappingTransform;
  roundDecimals?: number;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  keywords: string[];
  icon: ComponentType<{ className?: string }>;
  component?: ComponentType;
  stub?: true;
}
