const API_URL = 'https://customer-api-q0ym.onrender.com'; 

const authContainer = document.getElementById('auth-container');
const content = document.getElementById('content');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const authMessage = document.getElementById('auth-message');
const customersTableBody = document.getElementById('customers-table-body');
const addCustomerBtn = document.getElementById('add-customer-btn');
const customerFormContainer = document.getElementById('customer-form-container');
const saveCustomerBtn = document.getElementById('save-customer-btn');
const cancelCustomerBtn = document.getElementById('cancel-customer-btn');
const customerNameInput = document.getElementById('customer-name');
const customerPhoneInput = document.getElementById('customer-phone');
const customerAddressInput = document.getElementById('customer-address');
const customerCountInput = document.getElementById('customer-count');
const formTitle = document.getElementById('form-title');
const confirmationModal = document.getElementById('confirmation-modal');
const confirmYesBtn = document.getElementById('confirm-yes');
const confirmNoBtn = document.getElementById('confirm-no');
const confirmationMessage = document.getElementById('confirmation-message');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');

// Переменные для хранения состояния
let isEditing = false;
let currentEditingCustomer = null;
let pendingAction = null;
let allCustomers = [];

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', init);

function init() {
    confirmationModal.classList.add('hidden');
    logoutBtn.style.display = 'none';
    
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    
    if (isLoggedIn === 'true') {
        showContent();
        loadDataFromServer();
    } else {
        showAuth();
    }
    
    setupEventListeners();
}

function setupEventListeners() {
    loginBtn.addEventListener('click', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    addCustomerBtn.addEventListener('click', () => showCustomerForm());
    saveCustomerBtn.addEventListener('click', saveCustomer);
    cancelCustomerBtn.addEventListener('click', hideCustomerForm);
    searchBtn.addEventListener('click', handleSearch);
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    
    confirmYesBtn.addEventListener('click', confirmAction);
    confirmNoBtn.addEventListener('click', cancelAction);
    
    confirmationModal.addEventListener('click', (e) => {
        if (e.target === confirmationModal) cancelAction();
    });
    
    customerPhoneInput.addEventListener('input', validatePhoneInput);
}

function validatePhoneInput(e) {
    let input = e.target.value;
    // Разрешаем только цифры и + в начале
    input = input.replace(/[^0-9+]/g, '');
    if (input.startsWith('+')) {
        const digits = input.replace(/[^0-9]/g, '');
        if (digits.length > 12) {
            input = input.slice(0, -1);
        }
    } else {
        // Если нет +, удаляем все символы
        input = '';
    }
    
    e.target.value = input;
}

function isValidPhone(phone) {
    // Проверяем, что номер начинается с + и содержит ровно 12 цифр
    return phone.startsWith('+') && phone.replace(/[^0-9]/g, '').length === 12;
}

async function loadDataFromServer() {
    try {
        const response = await fetch(`${API_URL}/customers`);
        
        if (response.ok) {
            allCustomers = await response.json();
            allCustomers = allCustomers.map(customer => ({
                ...customer,
                id: customer.id.toString()
            }));
            updateCustomersTable(allCustomers);
        } else {
            throw new Error('Ошибка загрузки данных');
        }
    } catch (error) {
        authMessage.textContent = 'Ошибка подключения к серверу';
        
        const localData = localStorage.getItem('customerDB');
        if (localData) {
            allCustomers = JSON.parse(localData);
            allCustomers = allCustomers.map(customer => ({
                ...customer,
                id: customer.id.toString()
            }));
            updateCustomersTable(allCustomers);
        }
    }
}

async function saveDataToServer(method, url, data = null) {
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`Ошибка сервера: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        saveToLocalStorage(method, data);
        throw error;
    }
}

function saveToLocalStorage(method, data) {
    let db = JSON.parse(localStorage.getItem('customerDB') || '{"customers":[]}');
    
    if (method === 'POST') {
        const maxId = db.customers.length > 0 ? Math.max(...db.customers.map(c => parseInt(c.id) || 0)) : 0;
        data.id = (maxId + 1).toString();
        db.customers.push(data);
    } else if (method === 'PUT' || method === 'PATCH') {
        const index = db.customers.findIndex(c => c.id === data.id);
        if (index !== -1) {
            db.customers[index] = { ...db.customers[index], ...data };
        }
    } else if (method === 'DELETE') {
        db.customers = db.customers.filter(c => c.id !== data.id);
    }
    
    localStorage.setItem('customerDB', JSON.stringify(db));
    allCustomers = db.customers;
    updateCustomersTable(allCustomers);
}

async function handleLogin() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!username || !password) {
        authMessage.textContent = 'Заполните все поля';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/users`);
        
        if (!response.ok) {
            throw new Error('Ошибка сервера');
        }
        
        const users = await response.json();
        const user = users.find(u => u.name === username && u.password === password);
        
        if (user) {
            localStorage.setItem('isLoggedIn', 'true');
            showContent();
            loadDataFromServer();
        } else {
            authMessage.textContent = 'Неверное имя пользователя или пароль';
        }
    } catch (error) {
        if (username === 'Admin' && password === 'asdfghjkl') {
            localStorage.setItem('isLoggedIn', 'true');
            showContent();
            loadDataFromServer();
        } else {
            authMessage.textContent = 'Ошибка подключения к серверу';
        }
    }
}

function handleLogout() {
    localStorage.removeItem('isLoggedIn');
    showAuth();
    usernameInput.value = '';
    passwordInput.value = '';
    authMessage.textContent = '';
}

function showAuth() {
    authContainer.classList.remove('hidden');
    content.classList.add('hidden');
    logoutBtn.style.display = 'none';
}

function showContent() {
    authContainer.classList.add('hidden');
    content.classList.remove('hidden');
    logoutBtn.style.display = 'block';
}

function showCustomerForm(customer = null) {
    isEditing = customer !== null;
    currentEditingCustomer = customer;
    
    formTitle.textContent = isEditing ? 'Редактировать покупателя' : 'Добавить нового покупателя';
    
    if (customer) {
        customerNameInput.value = customer.name || '';
        customerPhoneInput.value = customer.phone || '';
        customerAddressInput.value = customer.adress || '';
        customerCountInput.value = customer.count || 0;
    } else {
        customerNameInput.value = '';
        customerPhoneInput.value = '';
        customerAddressInput.value = '';
        customerCountInput.value = '0';
    }
    
    customerFormContainer.classList.remove('hidden');
}

function hideCustomerForm() {
    customerFormContainer.classList.add('hidden');
    currentEditingCustomer = null;
}

async function saveCustomer() {
    const name = customerNameInput.value.trim();
    const phone = customerPhoneInput.value.trim();
    const address = customerAddressInput.value.trim();
    const count = parseInt(customerCountInput.value) || 0;
    
    if (!name || !phone || !address) {
        alert('Пожалуйста, заполните все поля');
        return;
    }
    
    if (!isValidPhone(phone)) {
        alert('Номер телефона должен начинаться с "+" и содержать ровно 12 цифр');
        return;
    }
    
    const customerData = { 
        name, 
        phone, 
        adress: address, 
        count 
    };
    
    if (isEditing && currentEditingCustomer) {
        if (!isValidPhone(phone)) {
            alert('Номер телефона должен начинаться с "+" и содержать ровно 12 цифр');
            return;
        }
        customerData.id = currentEditingCustomer.id;
        
        showConfirmation('Вы уверены, что хотите изменить данные покупателя?', async () => {
            try {
                await saveDataToServer('PUT', `${API_URL}/customers/${currentEditingCustomer.id}`, customerData);
                await loadDataFromServer();
                hideCustomerForm();
            } catch (error) {
                alert('Ошибка при сохранении изменений');
            }
        });
    } else {
        showConfirmation('Вы уверены, что хотите добавить нового покупателя?', async () => {
            try {
                const response = await fetch(`${API_URL}/customers`);
                if (!response.ok) {
                    throw new Error('Не удалось загрузить данные для генерации ID');
                }
                const customers = await response.json();
                const maxId = customers.length > 0 ? Math.max(...customers.map(c => parseInt(c.id) || 0)) : 0;
                customerData.id = (maxId + 1).toString();
                
                await saveDataToServer('POST', `${API_URL}/customers`, customerData);
                await loadDataFromServer();
                hideCustomerForm();
            } catch (error) {
                alert('Ошибка при добавлении покупателя');
            }
        });
    }
}

function updateCustomersTable(customers) {
    customersTableBody.innerHTML = '';
    
    if (customers.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="5" style="text-align: center;">Нет данных о покупателях</td>`;
        customersTableBody.appendChild(row);
        return;
    }
    
    customers.forEach(customer => {
        if (!customer.id) {
            return;
        }
        const row = document.createElement('tr');
        const hasPromotion = (customer.count + 1) % 3 === 0;
        
        row.innerHTML = `
            <td>${customer.name}</td>
            <td>${customer.phone}</td>
            <td>${customer.adress}</td>
            <td>
                <div class="count-controls">
                    <button class="count-btn decrease-btn" data-id="${customer.id}">-</button>
                    <span class="count-value">${customer.count}</span>
                    <button class="count-btn increase-btn" data-id="${customer.id}">+</button>
                </div>
                ${hasPromotion ? '<div class="promotion">На следующий заказ - акция!</div>' : ''}
            </td>
            <td>
                <button class="edit-btn" data-id="${customer.id}">Редактировать</button>
                <button class="delete-btn" data-id="${customer.id}">Удалить</button>
            </td>
        `;
        
        customersTableBody.appendChild(row);
    });
    
    attachEventHandlers();
}

function attachEventHandlers() {
    customersTableBody.removeEventListener('click', handleTableClick);
    customersTableBody.addEventListener('click', handleTableClick);

    function handleTableClick(event) {
        const target = event.target;
        const id = target.dataset.id;

        if (!id) {
            return;
        }

        const customer = allCustomers.find(c => c.id === id);

        if (!customer) {
            return;
        }

        if (target.classList.contains('edit-btn')) {
            showCustomerForm(customer);
        } else if (target.classList.contains('delete-btn')) {
            deleteCustomer(id);
        } else if (target.classList.contains('count-btn')) {
            const isIncrease = target.classList.contains('increase-btn');
            changeCount(id, isIncrease ? 1 : -1);
        }
    }
}

async function changeCount(id, delta) {
    const customer = allCustomers.find(c => c.id === id);
    
    if (customer) {
        const newCount = customer.count + delta;
        if (newCount < 0) return;
        
        try {
            await saveDataToServer('PATCH', `${API_URL}/customers/${id}`, { 
                count: newCount 
            });
            await loadDataFromServer();
        } catch (error) {
            alert('Ошибка при обновлении количества заказов');
        }
    }
}

async function deleteCustomer(id) {
    showConfirmation('Вы уверены, что хотите удалить этого покупателя?', async () => {
        try {
            await saveDataToServer('DELETE', `${API_URL}/customers/${id}`);
            await loadDataFromServer();
        } catch (error) {
            alert('Ошибка при удалении покупателя');
        }
    });
}

function handleSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (searchTerm === '') {
        updateCustomersTable(allCustomers);
        return;
    }
    
    const filteredCustomers = allCustomers.filter(customer => 
        customer.name.toLowerCase().includes(searchTerm) || 
        customer.phone.toLowerCase().includes(searchTerm)
    );
    
    updateCustomersTable(filteredCustomers);
}

function showConfirmation(message, callback) {
    confirmationMessage.textContent = message;
    confirmationModal.classList.remove('hidden');
    pendingAction = callback;
}

function confirmAction() {
    confirmationModal.classList.add('hidden');
    if (pendingAction && typeof pendingAction === 'function') {
        pendingAction();
    }
    pendingAction = null;
}

function cancelAction() {
    confirmationModal.classList.add('hidden');
    pendingAction = null;
}