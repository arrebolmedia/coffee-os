/**
 * CoffeeOS - Expenses Module
 * Gestión de gastos operativos y comprobantes
 */

'use client';

import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  useCreateExpense,
  useDeleteExpense,
  useExpenses,
  useUpdateExpense,
} from '@/hooks/use-expenses';
import { ExpenseModal } from '@/components/expenses/ExpenseModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Expense, ExpenseCategory, ExpenseStatus } from '@/types';
import {
  AlertTriangle,
  Building,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Edit,
  FileText,
  Filter,
  Loader2,
  Plus,
  Search,
  Tag,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';

export default function ExpensesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  // Mes actual por default (antes estaba hardcodeado '2024-11' y ocultaba todo)
  const [filterMonth, setFilterMonth] = useState<string>(() =>
    new Date().toISOString().substring(0, 7),
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // Get data from backend
  const { data: expensesData, isLoading, error } = useExpenses();
  // Mutations
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  // GET /finance/expenses devuelve un array plano (no { data: [...] })
  const expenses: Expense[] = useMemo(() => {
    return Array.isArray(expensesData) ? expensesData : [];
  }, [expensesData]);

  // Filtrar gastos
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const matchesSearch =
        searchQuery === '' ||
        expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.vendor_name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        expense.invoice_number
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());

      const matchesCategory =
        filterCategory === 'all' || expense.category === filterCategory;

      const matchesStatus =
        filterStatus === 'all' || expense.status === filterStatus;

      const matchesLocation =
        filterLocation === 'all' || expense.location_id === filterLocation;

      // El wire del módulo finance es snake_case: created_at
      const expenseMonth = new Date(expense.created_at)
        .toISOString()
        .substring(0, 7);
      const matchesMonth = expenseMonth === filterMonth;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus &&
        matchesLocation &&
        matchesMonth
      );
    });
  }, [
    expenses,
    searchQuery,
    filterCategory,
    filterStatus,
    filterLocation,
    filterMonth,
  ]);

  // Stats calculation
  const stats = useMemo(() => {
    return {
      total: expenses.length,
      pending: expenses.filter((e) => e.status === ExpenseStatus.PENDING)
        .length,
      paid: expenses.filter((e) => e.status === ExpenseStatus.PAID).length,
      overdue: expenses.filter((e) => e.status === ExpenseStatus.OVERDUE)
        .length,
      cancelled: expenses.filter((e) => e.status === ExpenseStatus.CANCELLED)
        .length,
      totalAmount: expenses
        .filter((e) => e.status !== ExpenseStatus.CANCELLED)
        .reduce((sum, e) => sum + e.total_amount, 0),
      paidAmount: expenses
        .filter((e) => e.status === ExpenseStatus.PAID)
        .reduce((sum, e) => sum + e.total_amount, 0),
    };
  }, [expenses]);

  // ============================================================================
  // CRUD HANDLERS
  // ============================================================================

  const handleCreateExpense = () => {
    setSelectedExpense(null);
    setIsModalOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsModalOpen(true);
  };

  const handleSaveExpense = async (data: Partial<Expense>) => {
    if (selectedExpense) {
      await updateExpense.mutateAsync({
        id: selectedExpense.id,
        data,
      });
    } else {
      await createExpense.mutateAsync(data);
    }
    setIsModalOpen(false);
    setSelectedExpense(null);
  };

  const handleDeleteClick = (expense: Expense) => {
    setExpenseToDelete(expense);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (expenseToDelete) {
      await deleteExpense.mutateAsync(expenseToDelete.id);
      setIsDeleteDialogOpen(false);
      setExpenseToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setExpenseToDelete(null);
  };

  // Helper functions
  const getCategoryLabel = (category: ExpenseCategory): string => {
    const labels: Record<ExpenseCategory, string> = {
      [ExpenseCategory.RENT]: 'Renta',
      [ExpenseCategory.UTILITIES]: 'Servicios',
      [ExpenseCategory.LABOR]: 'Nómina',
      [ExpenseCategory.SUPPLIES]: 'Insumos',
      [ExpenseCategory.MARKETING]: 'Marketing',
      [ExpenseCategory.EQUIPMENT]: 'Equipo',
      [ExpenseCategory.INSURANCE]: 'Seguros',
      [ExpenseCategory.TAXES]: 'Impuestos',
      [ExpenseCategory.PROFESSIONAL_SERVICES]: 'Servicios Profesionales',
      [ExpenseCategory.PERMITS_LICENSES]: 'Permisos',
      [ExpenseCategory.WASTE_MANAGEMENT]: 'Residuos',
      [ExpenseCategory.SECURITY]: 'Seguridad',
      [ExpenseCategory.OTHER]: 'Otros',
    };
    return labels[category] || category;
  };

  const getCategoryBadge = (category: ExpenseCategory) => {
    const categoryMap: Record<ExpenseCategory, string> = {
      [ExpenseCategory.RENT]: 'bg-purple-100 text-purple-800 border-purple-300',
      [ExpenseCategory.UTILITIES]: 'bg-blue-100 text-blue-800 border-blue-300',
      [ExpenseCategory.LABOR]: 'bg-green-100 text-green-800 border-green-300',
      [ExpenseCategory.SUPPLIES]: 'bg-cyan-100 text-cyan-800 border-cyan-300',
      [ExpenseCategory.MARKETING]:
        'bg-orange-100 text-orange-800 border-orange-300',
      [ExpenseCategory.EQUIPMENT]:
        'bg-indigo-100 text-indigo-800 border-indigo-300',
      [ExpenseCategory.INSURANCE]: 'bg-pink-100 text-pink-800 border-pink-300',
      [ExpenseCategory.TAXES]: 'bg-red-100 text-red-800 border-red-300',
      [ExpenseCategory.PROFESSIONAL_SERVICES]:
        'bg-teal-100 text-teal-800 border-teal-300',
      [ExpenseCategory.PERMITS_LICENSES]:
        'bg-amber-100 text-amber-800 border-amber-300',
      [ExpenseCategory.WASTE_MANAGEMENT]:
        'bg-lime-100 text-lime-800 border-lime-300',
      [ExpenseCategory.SECURITY]:
        'bg-slate-100 text-slate-800 border-slate-300',
      [ExpenseCategory.OTHER]: 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return categoryMap[category] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStatusBadge = (status: ExpenseStatus) => {
    const statusMap: Record<ExpenseStatus, string> = {
      [ExpenseStatus.PAID]: 'bg-green-100 text-green-800 border-green-300',
      [ExpenseStatus.PENDING]:
        'bg-yellow-100 text-yellow-800 border-yellow-300',
      [ExpenseStatus.OVERDUE]: 'bg-red-100 text-red-800 border-red-300',
      [ExpenseStatus.CANCELLED]: 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStatusIcon = (status: ExpenseStatus) => {
    switch (status) {
      case ExpenseStatus.PAID:
        return <CheckCircle className="w-4 h-4" />;
      case ExpenseStatus.PENDING:
        return <Clock className="w-4 h-4" />;
      case ExpenseStatus.OVERDUE:
        return <AlertTriangle className="w-4 h-4" />;
      case ExpenseStatus.CANCELLED:
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: ExpenseStatus) => {
    const statusText: Record<ExpenseStatus, string> = {
      [ExpenseStatus.PAID]: 'Pagado',
      [ExpenseStatus.PENDING]: 'Pendiente',
      [ExpenseStatus.OVERDUE]: 'Vencido',
      [ExpenseStatus.CANCELLED]: 'Cancelado',
    };
    return statusText[status] || status;
  };

  // La compuerta de carga no puede tragarse un diálogo abierto: el `return`
  // temprano sustituye la página entera —modales incluidos—, así que una
  // consulta de fondo que vuelve a cargar mientras el usuario escribe desmonta
  // el formulario y borra lo tecleado. Con un diálogo abierto se sigue de largo.
  const hayDialogoAbierto = isModalOpen || isDeleteDialogOpen;

  if (isLoading && !hayDialogoAbierto) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-screen text-red-600">
          <AlertTriangle className="w-12 h-12 mb-4" />
          <p>Error al cargar gastos</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CreditCard className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">Gastos</h1>
                  <p className="text-sm text-gray-500">
                    Control y aprobación de gastos operativos
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Download className="w-4 h-4" />
                  Exportar
                </button>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Upload className="w-4 h-4" />
                  Importar
                </button>
                <button
                  onClick={handleCreateExpense}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Nuevo Gasto
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Gastos</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {stats.total}
                  </p>
                </div>
                <CreditCard className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.pending}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Vencidos</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.overdue}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pagados</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.paid}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Monto</p>
                  <p className="text-2xl font-bold text-gray-800">
                    $
                    {stats.totalAmount.toLocaleString('es-MX', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pagado</p>
                  <p className="text-2xl font-bold text-green-600">
                    $
                    {stats.paidAmount.toLocaleString('es-MX', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-400" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar gasto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Month Filter */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Category Filter */}
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
                >
                  <option value="all">Todas las Categorías</option>
                  <option value={ExpenseCategory.RENT}>Renta</option>
                  <option value={ExpenseCategory.UTILITIES}>Servicios</option>
                  <option value={ExpenseCategory.LABOR}>Nómina</option>
                  <option value={ExpenseCategory.SUPPLIES}>Insumos</option>
                  <option value={ExpenseCategory.MARKETING}>Marketing</option>
                  <option value={ExpenseCategory.EQUIPMENT}>Equipo</option>
                  <option value={ExpenseCategory.INSURANCE}>Seguros</option>
                  <option value={ExpenseCategory.TAXES}>Impuestos</option>
                  <option value={ExpenseCategory.PROFESSIONAL_SERVICES}>
                    Servicios Profesionales
                  </option>
                  <option value={ExpenseCategory.PERMITS_LICENSES}>
                    Permisos
                  </option>
                  <option value={ExpenseCategory.WASTE_MANAGEMENT}>
                    Residuos
                  </option>
                  <option value={ExpenseCategory.SECURITY}>Seguridad</option>
                  <option value={ExpenseCategory.OTHER}>Otros</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
                >
                  <option value="all">Todos los Estados</option>
                  <option value={ExpenseStatus.PENDING}>Pendiente</option>
                  <option value={ExpenseStatus.PAID}>Pagado</option>
                  <option value={ExpenseStatus.OVERDUE}>Vencido</option>
                  <option value={ExpenseStatus.CANCELLED}>Cancelado</option>
                </select>
              </div>

              {/* Location Filter */}
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
                >
                  <option value="all">Todas las Ubicaciones</option>
                  <option value="Sucursal Centro">Sucursal Centro</option>
                  <option value="Sucursal Polanco">Sucursal Polanco</option>
                  <option value="Sucursal Santa Fe">Sucursal Santa Fe</option>
                  <option value="Corporativo">Corporativo</option>
                  <option value="Todas las Sucursales">
                    Todas las Sucursales
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Expenses List */}
          <div className="space-y-4">
            {filteredExpenses.map((expense) => {
              const expenseDate = new Date(expense.created_at);
              const folio = `GTO-${expenseDate.getFullYear()}-${expense.id.slice(0, 8).toUpperCase()}`;

              return (
                <div
                  key={expense.id}
                  className={`bg-white rounded-lg shadow overflow-hidden ${
                    expense.status === ExpenseStatus.CANCELLED
                      ? 'border-l-4 border-red-500 opacity-75'
                      : expense.status === ExpenseStatus.PAID
                        ? 'border-l-4 border-green-500'
                        : expense.status === ExpenseStatus.OVERDUE
                          ? 'border-l-4 border-red-500'
                          : expense.status === ExpenseStatus.PENDING
                            ? 'border-l-4 border-yellow-500'
                            : ''
                  }`}
                >
                  <div className="p-6">
                    {/* Expense Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">
                            {folio}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getCategoryBadge(
                              expense.category,
                            )}`}
                          >
                            {getCategoryLabel(expense.category)}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(
                              expense.status,
                            )}`}
                          >
                            {getStatusIcon(expense.status)}
                            {getStatusText(expense.status)}
                          </span>
                          {expense.invoice_number && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
                              <FileText className="w-3 h-3" />
                              Factura
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {expenseDate.toLocaleDateString('es-MX', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                          {expense.due_date && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Vence:{' '}
                              {new Date(expense.due_date).toLocaleDateString(
                                'es-MX',
                                {
                                  day: '2-digit',
                                  month: 'short',
                                },
                              )}
                            </div>
                          )}
                          {expense.paid_date && (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              Pagado:{' '}
                              {new Date(expense.paid_date).toLocaleDateString(
                                'es-MX',
                                {
                                  day: '2-digit',
                                  month: 'short',
                                },
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-green-600">
                          $
                          {expense.total_amount.toLocaleString('es-MX', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-xs text-gray-500">MXN</div>
                        {expense.tax_amount && expense.tax_amount > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            IVA: $
                            {expense.tax_amount.toLocaleString('es-MX', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {expense.description}
                      </p>
                      <div className="flex items-center gap-6 text-xs text-gray-600">
                        {expense.vendor_name && (
                          <div>Proveedor: {expense.vendor_name}</div>
                        )}
                        {expense.payment_method && (
                          <div>
                            Forma de pago:{' '}
                            {expense.payment_method === 'CASH'
                              ? 'Efectivo'
                              : expense.payment_method === 'TRANSFER'
                                ? 'Transferencia'
                                : expense.payment_method === 'CHECK'
                                  ? 'Cheque'
                                  : expense.payment_method === 'CARD'
                                    ? 'Tarjeta'
                                    : 'Crédito'}
                          </div>
                        )}
                        {expense.invoice_number && (
                          <div>Factura: {expense.invoice_number}</div>
                        )}
                        {expense.vendor_rfc && (
                          <div>RFC: {expense.vendor_rfc}</div>
                        )}
                      </div>
                      {expense.payment_reference && (
                        <div className="mt-2 text-xs text-gray-600">
                          Referencia: {expense.payment_reference}
                        </div>
                      )}
                    </div>

                    {/* Attachment */}
                    {expense.attachment_url && (
                      <div className="mb-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Documentos adjuntos:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={expense.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-xs"
                          >
                            <FileText className="w-3 h-3" />
                            Ver documento
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {expense.notes && (
                      <div className="mb-4 pt-4 border-t border-gray-200">
                        <p className="text-sm italic text-gray-600">
                          {expense.notes}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleEditExpense(expense)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        <Edit className="w-4 h-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteClick(expense)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
                        Eliminar
                      </button>
                      {expense.status === ExpenseStatus.PENDING &&
                        !expense.paid_date && (
                          <button
                            onClick={() => {
                              // You can implement a quick "mark as paid" action here
                              handleEditExpense(expense);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium ml-auto"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Marcar como Pagado
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredExpenses.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No se encontraron gastos
              </h3>
              <p className="text-gray-600">
                Intenta ajustar los filtros de búsqueda
              </p>
            </div>
          )}

          {/* Info Footer */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-green-900 mb-1">
                  Control de Gastos Operativos
                </h4>
                <p className="text-sm text-green-700">
                  Todos los gastos deben ser aprobados antes de su pago. Es
                  obligatorio adjuntar factura o comprobante fiscal para gastos
                  mayores a $2,000 MXN. Los gastos sin factura no son
                  deducibles. Se recomienda solicitar aprobación previa para
                  gastos mayores a $5,000 MXN. Categoriza correctamente cada
                  gasto para facilitar el análisis financiero. Mantén copias
                  digitales de todos los comprobantes por 5 años mínimo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedExpense(null);
        }}
        onSave={handleSaveExpense}
        expense={selectedExpense}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Eliminar Gasto"
        message={`¿Estás seguro de que deseas eliminar este gasto? Esta acción no se puede deshacer.`}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </MainLayout>
  );
}
