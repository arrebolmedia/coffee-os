#!/usr/bin/env node

/**
 * Script de Configuración Automática de Baserow
 * Crea todas las tablas y campos necesarios para CoffeeOS
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuración
const BASEROW_URL = process.env.BASEROW_URL || 'http://localhost:8000';
const BASEROW_TOKEN = process.env.BASEROW_TOKEN;
const DATABASE_NAME = 'CoffeeOS Core';

if (!BASEROW_TOKEN) {
    console.error('❌ Error: BASEROW_TOKEN no está configurado');
    console.log('💡 Genera un token en Baserow → Configuración → API tokens');
    process.exit(1);
}

// Cliente API de Baserow
const baserowClient = axios.create({
    baseURL: `${BASEROW_URL}/api`,
    headers: {
        'Authorization': `Token ${BASEROW_TOKEN}`,
        'Content-Type': 'application/json'
    }
});

// Esquema de tablas de CoffeeOS
const TABLES_SCHEMA = {
    // 🏢 Core Tables
    organizations: {
        name: 'Organizations',
        fields: [
            { name: 'name', type: 'text', primary: true },
            { name: 'slug', type: 'text' },
            { name: 'description', type: 'long_text' },
            { name: 'timezone', type: 'single_select', select_options: [
                { value: 'America/Mexico_City', color: 'blue' },
                { value: 'America/Cancun', color: 'green' },
                { value: 'America/Mazatlan', color: 'yellow' },
                { value: 'America/Tijuana', color: 'red' }
            ]},
            { name: 'active', type: 'boolean' }
        ]
    },
    
    locations: {
        name: 'Locations',
        fields: [
            { name: 'name', type: 'text', primary: true },
            { name: 'organization', type: 'link_row', link_row_table: 'organizations' },
            { name: 'address', type: 'long_text' },
            { name: 'city', type: 'text' },
            { name: 'state', type: 'single_select', select_options: [
                { value: 'CDMX', color: 'red' },
                { value: 'Jalisco', color: 'blue' },
                { value: 'Nuevo León', color: 'green' },
                { value: 'Yucatán', color: 'yellow' }
            ]},
            { name: 'postal_code', type: 'text' },
            { name: 'phone', type: 'phone_number' },
            { name: 'email', type: 'email' },
            { name: 'timezone', type: 'single_select', select_options: [
                { value: 'America/Mexico_City', color: 'blue' }
            ]},
            { name: 'tax_rate', type: 'number', number_decimal_places: 4 },
            { name: 'currency', type: 'single_select', select_options: [
                { value: 'MXN', color: 'green' },
                { value: 'USD', color: 'blue' }
            ]},
            { name: 'active', type: 'boolean' }
        ]
    },

    roles: {
        name: 'Roles',
        fields: [
            { name: 'name', type: 'single_select', primary: true, select_options: [
                { value: 'Propietario', color: 'red' },
                { value: 'Gerente', color: 'blue' },
                { value: 'Líder de barra', color: 'green' },
                { value: 'Barista', color: 'yellow' },
                { value: 'Caja', color: 'orange' },
                { value: 'Auditor', color: 'purple' },
                { value: 'Contador', color: 'gray' }
            ]},
            { name: 'description', type: 'long_text' },
            { name: 'scopes', type: 'long_text' },
            { name: 'active', type: 'boolean' }
        ]
    },

    users: {
        name: 'Users',
        fields: [
            { name: 'email', type: 'email', primary: true },
            { name: 'organization', type: 'link_row', link_row_table: 'organizations' },
            { name: 'role', type: 'link_row', link_row_table: 'roles' },
            { name: 'locations', type: 'link_row', link_row_table: 'locations', has_related_field: false },
            { name: 'first_name', type: 'text' },
            { name: 'last_name', type: 'text' },
            { name: 'phone', type: 'phone_number' },
            { name: 'avatar', type: 'file' },
            { name: 'email_verified', type: 'date' },
            { name: 'two_factor_enabled', type: 'boolean' },
            { name: 'last_login_at', type: 'date' },
            { name: 'active', type: 'boolean' }
        ]
    },

    // 🛍️ Productos
    categories: {
        name: 'Categories',
        fields: [
            { name: 'name', type: 'text', primary: true },
            { name: 'description', type: 'long_text' },
            { name: 'color', type: 'text' },
            { name: 'icon', type: 'text' },
            { name: 'sort_order', type: 'number' },
            { name: 'active', type: 'boolean' }
        ]
    },

    products: {
        name: 'Products',
        fields: [
            { name: 'name', type: 'text', primary: true },
            { name: 'category', type: 'link_row', link_row_table: 'categories' },
            { name: 'sku', type: 'text' },
            { name: 'description', type: 'long_text' },
            { name: 'image', type: 'file' },
            { name: 'price', type: 'number', number_decimal_places: 2 },
            { name: 'cost', type: 'number', number_decimal_places: 2 },
            { name: 'tax_rate', type: 'number', number_decimal_places: 4 },
            { name: 'allow_modifiers', type: 'boolean' },
            { name: 'track_inventory', type: 'boolean' },
            { name: 'active', type: 'boolean' }
        ]
    },

    modifiers: {
        name: 'Modifiers',
        fields: [
            { name: 'name', type: 'text', primary: true },
            { name: 'type', type: 'single_select', select_options: [
                { value: 'SIZE', color: 'blue' },
                { value: 'MILK', color: 'green' },
                { value: 'EXTRA', color: 'yellow' },
                { value: 'SYRUP', color: 'orange' },
                { value: 'DECAF', color: 'red' }
            ]},
            { name: 'price_delta', type: 'number', number_decimal_places: 2 },
            { name: 'active', type: 'boolean' }
        ]
    },

    // 📦 Inventario
    suppliers: {
        name: 'Suppliers',
        fields: [
            { name: 'name', type: 'text', primary: true },
            { name: 'contact_name', type: 'text' },
            { name: 'email', type: 'email' },
            { name: 'phone', type: 'phone_number' },
            { name: 'address', type: 'long_text' },
            { name: 'payment_terms', type: 'single_select', select_options: [
                { value: 'Contado', color: 'green' },
                { value: '15 días', color: 'yellow' },
                { value: '30 días', color: 'orange' },
                { value: '45 días', color: 'red' }
            ]},
            { name: 'lead_time', type: 'number' },
            { name: 'active', type: 'boolean' }
        ]
    },

    inventory_items: {
        name: 'InventoryItems',
        fields: [
            { name: 'name', type: 'text', primary: true },
            { name: 'code', type: 'text' },
            { name: 'description', type: 'long_text' },
            { name: 'unit_of_measure', type: 'single_select', select_options: [
                { value: 'ml', color: 'blue' },
                { value: 'g', color: 'green' },
                { value: 'unit', color: 'yellow' },
                { value: 'kg', color: 'orange' },
                { value: 'l', color: 'red' }
            ]},
            { name: 'cost_per_unit', type: 'number', number_decimal_places: 4 },
            { name: 'par_level', type: 'number' },
            { name: 'reorder_point', type: 'number' },
            { name: 'category', type: 'single_select', select_options: [
                { value: 'Café', color: 'brown' },
                { value: 'Leche', color: 'blue' },
                { value: 'Endulzantes', color: 'yellow' },
                { value: 'Vasos', color: 'green' },
                { value: 'Tapas', color: 'red' }
            ]},
            { name: 'supplier', type: 'link_row', link_row_table: 'suppliers' },
            { name: 'active', type: 'boolean' }
        ]
    },

    // ☕ Recetas
    recipes: {
        name: 'Recipes',
        fields: [
            { name: 'name', type: 'text', primary: true },
            { name: 'product', type: 'link_row', link_row_table: 'products' },
            { name: 'description', type: 'long_text' },
            { name: 'instructions', type: 'long_text' },
            { name: 'yield', type: 'number' },
            { name: 'yield_unit', type: 'single_select', select_options: [
                { value: 'ml', color: 'blue' },
                { value: 'g', color: 'green' },
                { value: 'unit', color: 'yellow' }
            ]},
            { name: 'prep_time', type: 'number' },
            { name: 'allergens', type: 'multiple_select', select_options: [
                { value: 'Gluten', color: 'red' },
                { value: 'Lactosa', color: 'blue' },
                { value: 'Frutos secos', color: 'orange' },
                { value: 'Soja', color: 'green' }
            ]},
            { name: 'video_url', type: 'url' },
            { name: 'version', type: 'number' },
            { name: 'active', type: 'boolean' }
        ]
    },

    // 👥 CRM
    customers: {
        name: 'Customers',
        fields: [
            { name: 'email', type: 'email', primary: true },
            { name: 'phone', type: 'phone_number' },
            { name: 'first_name', type: 'text' },
            { name: 'last_name', type: 'text' },
            { name: 'birthday', type: 'date' },
            { name: 'loyalty_points', type: 'number' },
            { name: 'rfm_bucket', type: 'single_select', select_options: [
                { value: 'Champions', color: 'green' },
                { value: 'Loyal', color: 'blue' },
                { value: 'Potential', color: 'yellow' },
                { value: 'New', color: 'orange' },
                { value: 'At Risk', color: 'red' },
                { value: 'Lost', color: 'gray' }
            ]},
            { name: 'preferences', type: 'long_text' },
            { name: 'active', type: 'boolean' }
        ]
    },

    // 🏪 POS
    tickets: {
        name: 'Tickets',
        fields: [
            { name: 'ticket_number', type: 'text', primary: true },
            { name: 'location', type: 'link_row', link_row_table: 'locations' },
            { name: 'user', type: 'link_row', link_row_table: 'users' },
            { name: 'customer', type: 'link_row', link_row_table: 'customers' },
            { name: 'status', type: 'single_select', select_options: [
                { value: 'OPEN', color: 'yellow' },
                { value: 'CLOSED', color: 'green' },
                { value: 'REFUNDED', color: 'red' },
                { value: 'VOIDED', color: 'gray' }
            ]},
            { name: 'subtotal', type: 'number', number_decimal_places: 2 },
            { name: 'tax', type: 'number', number_decimal_places: 2 },
            { name: 'tip', type: 'number', number_decimal_places: 2 },
            { name: 'discount', type: 'number', number_decimal_places: 2 },
            { name: 'total', type: 'number', number_decimal_places: 2 },
            { name: 'opened_at', type: 'date' },
            { name: 'closed_at', type: 'date' },
            { name: 'notes', type: 'text' }
        ]
    }
};

class BaserowConfigurator {
    constructor() {
        this.databaseId = null;
        this.tableIds = {};
        this.createdTables = 0;
        this.totalTables = Object.keys(TABLES_SCHEMA).length;
    }

    async init() {
        console.log('🚀 Iniciando configuración de Baserow...');
        console.log(`📊 Se crearán ${this.totalTables} tablas principales\n`);
        
        try {
            await this.createDatabase();
            await this.createTables();
            await this.setupRelationships();
            await this.importInitialData();
            
            console.log('\n✅ ¡Configuración completada exitosamente!');
            console.log(`📊 Base de datos: ${DATABASE_NAME} (ID: ${this.databaseId})`);
            console.log(`🗂️ Tablas creadas: ${this.createdTables}/${this.totalTables}`);
            console.log('\n🎯 Próximos pasos:');
            console.log('1. Configurar permisos por rol en Baserow UI');
            console.log('2. Crear vistas personalizadas');
            console.log('3. Configurar webhooks para n8n');
            console.log('4. Generar API token para la app');
            
        } catch (error) {
            console.error('❌ Error durante la configuración:', error.message);
            if (error.response?.data) {
                console.error('📄 Detalles:', JSON.stringify(error.response.data, null, 2));
            }
            process.exit(1);
        }
    }

    async createDatabase() {
        console.log('📚 Creando base de datos...');
        
        try {
            const response = await baserowClient.post('/databases/', {
                name: DATABASE_NAME
            });
            
            this.databaseId = response.data.id;
            console.log(`✅ Base de datos creada: ${DATABASE_NAME} (ID: ${this.databaseId})`);
            
        } catch (error) {
            if (error.response?.status === 400 && error.response.data.name) {
                throw new Error('Ya existe una base de datos con ese nombre');
            }
            throw error;
        }
    }

    async createTables() {
        console.log('\n🗂️ Creando tablas...');
        
        for (const [tableKey, tableConfig] of Object.entries(TABLES_SCHEMA)) {
            try {
                console.log(`   📋 Creando tabla: ${tableConfig.name}...`);
                
                // Crear tabla básica primero
                const tableResponse = await baserowClient.post(`/database/tables/`, {
                    database_id: this.databaseId,
                    name: tableConfig.name
                });
                
                const tableId = tableResponse.data.id;
                this.tableIds[tableKey] = tableId;
                
                // Eliminar el campo de texto por defecto si existe
                const fieldsResponse = await baserowClient.get(`/database/tables/${tableId}/fields/`);
                for (const field of fieldsResponse.data) {
                    if (field.name === 'Name') {
                        await baserowClient.delete(`/database/fields/${field.id}/`);
                    }
                }
                
                // Crear campos personalizados
                for (const fieldConfig of tableConfig.fields) {
                    await this.createField(tableId, fieldConfig, tableKey);
                }
                
                this.createdTables++;
                console.log(`   ✅ Tabla completada: ${tableConfig.name} (${this.createdTables}/${this.totalTables})`);
                
                // Pequeña pausa para evitar rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.error(`   ❌ Error creando tabla ${tableConfig.name}:`, error.message);
                throw error;
            }
        }
    }

    async createField(tableId, fieldConfig, tableKey) {
        const fieldData = {
            table_id: tableId,
            name: fieldConfig.name,
            type: fieldConfig.type
        };

        // Configuraciones específicas por tipo de campo
        switch (fieldConfig.type) {
            case 'text':
                if (fieldConfig.primary) {
                    fieldData.primary = true;
                }
                break;
                
            case 'number':
                if (fieldConfig.number_decimal_places !== undefined) {
                    fieldData.number_decimal_places = fieldConfig.number_decimal_places;
                }
                break;
                
            case 'single_select':
            case 'multiple_select':
                if (fieldConfig.select_options) {
                    fieldData.select_options = fieldConfig.select_options;
                }
                break;
                
            case 'link_row':
                if (fieldConfig.link_row_table && this.tableIds[fieldConfig.link_row_table]) {
                    fieldData.link_row_table_id = this.tableIds[fieldConfig.link_row_table];
                } else {
                    // Si la tabla referenciada no existe aún, saltamos este campo
                    console.log(`   ⏳ Postergando campo de relación: ${fieldConfig.name}`);
                    return;
                }
                break;
        }

        try {
            await baserowClient.post('/database/fields/', fieldData);
        } catch (error) {
            console.log(`   ⚠️ Campo ${fieldConfig.name} ya existe o hubo un error`);
        }
    }

    async setupRelationships() {
        console.log('\n🔗 Configurando relaciones entre tablas...');
        
        // Segunda pasada para crear campos de relación que no se pudieron crear antes
        for (const [tableKey, tableConfig] of Object.entries(TABLES_SCHEMA)) {
            const tableId = this.tableIds[tableKey];
            
            for (const fieldConfig of tableConfig.fields) {
                if (fieldConfig.type === 'link_row' && fieldConfig.link_row_table) {
                    const targetTableId = this.tableIds[fieldConfig.link_row_table];
                    
                    if (targetTableId) {
                        try {
                            await baserowClient.post('/database/fields/', {
                                table_id: tableId,
                                name: fieldConfig.name,
                                type: 'link_row',
                                link_row_table_id: targetTableId,
                                has_related_field: fieldConfig.has_related_field !== false
                            });
                            
                            console.log(`   ✅ Relación creada: ${tableConfig.name}.${fieldConfig.name}`);
                            
                        } catch (error) {
                            // Ignorar si ya existe
                        }
                    }
                }
            }
        }
    }

    async importInitialData() {
        console.log('\n📄 Importando datos iniciales...');
        
        // Datos iniciales para roles
        const rolesData = [
            {
                name: 'Propietario',
                description: 'Acceso completo al sistema, configuración global',
                scopes: JSON.stringify(['*']),
                active: true
            },
            {
                name: 'Gerente',
                description: 'Gestión completa de ubicación, reportes, configuración',
                scopes: JSON.stringify(['pos', 'inventory', 'reports', 'users', 'quality']),
                active: true
            },
            {
                name: 'Líder de barra',
                description: 'Supervisión de operaciones, calidad, recetas',
                scopes: JSON.stringify(['pos', 'inventory.read', 'quality', 'recipes']),
                active: true
            }
        ];

        const rolesTableId = this.tableIds.roles;
        if (rolesTableId) {
            for (const roleData of rolesData) {
                try {
                    await baserowClient.post(`/database/tables/${rolesTableId}/rows/`, roleData);
                } catch (error) {
                    // Ignorar duplicados
                }
            }
            console.log('   ✅ Roles iniciales creados');
        }

        // Datos iniciales para categorías
        const categoriesData = [
            {
                name: 'Cafés Calientes',
                description: 'Bebidas de café servidas calientes',
                color: '#8B4513',
                icon: '☕',
                sort_order: 1,
                active: true
            },
            {
                name: 'Cafés Fríos',
                description: 'Bebidas de café servidas frías',
                color: '#4169E1',
                icon: '🧊',
                sort_order: 2,
                active: true
            },
            {
                name: 'Pasteles',
                description: 'Productos de panadería y repostería',
                color: '#FF69B4',
                icon: '🧁',
                sort_order: 3,
                active: true
            }
        ];

        const categoriesTableId = this.tableIds.categories;
        if (categoriesTableId) {
            for (const categoryData of categoriesData) {
                try {
                    await baserowClient.post(`/database/tables/${categoriesTableId}/rows/`, categoryData);
                } catch (error) {
                    // Ignorar duplicados
                }
            }
            console.log('   ✅ Categorías iniciales creadas');
        }
    }

    async generateApiInfo() {
        const info = {
            database_id: this.databaseId,
            tables: this.tableIds,
            api_url: `${BASEROW_URL}/api/database/tables/`,
            created_at: new Date().toISOString(),
            config: {
                name: DATABASE_NAME,
                tables_count: this.createdTables,
                baserow_url: BASEROW_URL
            }
        };

        // Guardar información de configuración
        const configPath = path.join(__dirname, '..', 'config', 'baserow.json');
        fs.writeFileSync(configPath, JSON.stringify(info, null, 2));
        console.log(`\n💾 Configuración guardada en: ${configPath}`);
        
        return info;
    }
}

// Ejecutar configuración
if (require.main === module) {
    const configurator = new BaserowConfigurator();
    configurator.init()
        .then(async () => {
            const info = await configurator.generateApiInfo();
            
            console.log('\n🔑 Información de API:');
            console.log(`Database ID: ${info.database_id}`);
            console.log(`API URL: ${info.api_url}`);
            console.log(`Token: ${BASEROW_TOKEN.slice(0, 8)}...`);
        })
        .catch(error => {
            console.error('❌ Error fatal:', error.message);
            process.exit(1);
        });
}

module.exports = { BaserowConfigurator, TABLES_SCHEMA };