const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

let employees = [];

function menu() {
    console.log('\nEmployee Management System');
    console.log('1. Add Employee');
    console.log('2. List Employees');
    console.log('3. Remove Employee');
    console.log('4. Exit');
    readline.question('Choose an option: ', option => {
        switch(option.trim()) {
            case '1':
                addEmployee();
                break;
            case '2':
                listEmployees();
                break;
            case '3':
                removeEmployee();
                break;
            case '4':
                readline.close();
                break;
            default:
                console.log('Invalid option.');
                menu();
        }
    });
}

function addEmployee() {
    readline.question('Enter Employee Name: ', name => {
        readline.question('Enter Employee ID: ', id => {
            employees.push({name: name.trim(), id: id.trim()});
            console.log('Employee added.');
            menu();
        });
    });
}

function listEmployees() {
    if (employees.length === 0) {
        console.log('No employees to show.');
    } else {
        console.log('\nEmployee List:');
        employees.forEach((emp, idx) => {
            console.log(`${idx+1}. Name: ${emp.name}, ID: ${emp.id}`);
        });
    }
    menu();
}

function removeEmployee() {
    readline.question('Enter Employee ID to remove: ', id => {
        const index = employees.findIndex(emp => emp.id === id.trim());
        if (index !== -1) {
            employees.splice(index, 1);
            console.log('Employee removed.');
        } else {
            console.log('Employee not found.');
        }
        menu();
    });
}

menu();