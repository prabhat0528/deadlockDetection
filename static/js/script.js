
document.getElementById('processForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const status = document.getElementById('status');

    // Extract input values
    const max_r1 = parseInt(document.getElementById('max_r1').value);
    const max_r2 = parseInt(document.getElementById('max_r2').value);
    const max_r3 = parseInt(document.getElementById('max_r3').value);
    const alloc_r1 = parseInt(document.getElementById('alloc_r1').value);
    const alloc_r2 = parseInt(document.getElementById('alloc_r2').value);
    const alloc_r3 = parseInt(document.getElementById('alloc_r3').value);

    // Client-side validation
    if (alloc_r1 > max_r1) {
        status.textContent = `Error: Allocated R1 (${alloc_r1}) exceeds maximum need R1 (${max_r1})`;
        status.classList.add('text-red-600');
        status.classList.remove('text-green-600');
        return;
    }
    if (alloc_r2 > max_r2) {
        status.textContent = `Error: Allocated R2 (${alloc_r2}) exceeds maximum need R2 (${max_r2})`;
        status.classList.add('text-red-600');
        status.classList.remove('text-green-600');
        return;
    }
    if (alloc_r3 > max_r3) {
        status.textContent = `Error: Allocated R3 (${alloc_r3}) exceeds maximum need R3 (${max_r3})`;
        status.classList.add('text-red-600');
        status.classList.remove('text-green-600');
        return;
    }

    // Proceed with fetch if validation passes
    const data = {
        max_r1: max_r1,
        max_r2: max_r2,
        max_r3: max_r3,
        alloc_r1: alloc_r1,
        alloc_r2: alloc_r2,
        alloc_r3: alloc_r3
    };
    fetch('/add_process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.message); });
        }
        return response.json();
    })
    .then(data => {
        if (data.status === "error") {
            status.textContent = data.message;
            status.classList.add('text-red-600');
            status.classList.remove('text-green-600');
        } else {
            updateGraph();
            document.getElementById('resolveDeadlock').disabled = true;
            document.getElementById('finalGraphSection').style.display = 'none';
            document.getElementById('processForm').reset();
            updateProcessTable(data.processes);
            status.textContent = "Process added successfully";
            status.classList.add('text-green-600');
            status.classList.remove('text-red-600');
        }
    })
    .catch(error => {
        status.textContent = error.message || "Error adding process";
        status.classList.add('text-red-600');
        status.classList.remove('text-green-600');
    });
});

document.getElementById('checkDeadlock').addEventListener('click', function() {
    const algorithm = document.getElementById('algorithm').value;
    fetch('/check_deadlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ algorithm: algorithm })
    })
    .then(response => response.json())
    .then(data => {
        const status = document.getElementById('status');
        const resolveBtn = document.getElementById('resolveDeadlock');
        console.log('Response from /check_deadlock:', data);

        if (data.deadlock) {
            status.textContent = `Deadlock detected! Suggestion: ${data.suggestion}`;
            resolveBtn.disabled = false;
            status.classList.add('text-red-600');
            status.classList.remove('text-green-600');
        } else {
            const safeSeq = data.safe_sequence || [];
            if (safeSeq.length > 0) {
                status.textContent = `No deadlock detected. Safe sequence: ${safeSeq.join(', ')}`;
            } else {
                status.textContent = 'No deadlock detected. No safe sequence available.';
            }
            resolveBtn.disabled = true;
            document.getElementById('finalGraphSection').style.display = 'none';
            status.classList.add('text-green-600');
            status.classList.remove('text-red-600');
        }
    })
    .catch(error => {
        console.error('Error fetching deadlock status:', error);
        document.getElementById('status').textContent = 'Error checking deadlock.';
    });
});

document.getElementById('resolveDeadlock').addEventListener('click', function() {
    const algorithm = document.getElementById('algorithm').value;
    fetch('/resolve_deadlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ algorithm: algorithm })
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('status').textContent = data.message;
        document.getElementById('resolveDeadlock').disabled = true;
        const options = {
            nodes: { shape: 'box', font: { size: 16 } },
            edges: { arrows: 'to', font: { align: 'middle' } },
            groups: {
                process: { color: { background: '#cce5ff', border: '#0066cc' } },
                resource: { color: { background: '#ccffcc', border: '#009900' } }
            }
        };
        new vis.Network(document.getElementById('currentGraph'), data.initial_graph, options);
        document.getElementById('finalGraphSection').style.display = 'block';
        new vis.Network(document.getElementById('finalGraph'), data.final_graph, options);
        fetch('/get_graph_data')
            .then(response => response.json())
            .then(graphData => {
                const updatedProcesses = graphData.nodes
                    .filter(node => node.group === 'process')
                    .map(node => node.id);
                const updatedAlloc = updatedProcesses.map(pid => {
                    const idx = processes.indexOf(pid);
                    return alloc_matrix[idx];
                });
                updateProcessTable(updatedProcesses.map((id, idx) => ({ id, alloc: updatedAlloc[idx] })));
            });
    });
});

document.getElementById('reset').addEventListener('click', function() {
    fetch('/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
    .then(response => response.json())
    .then(data => {
        document.getElementById('status').textContent = data.status;
        document.getElementById('resolveDeadlock').disabled = true;
        document.getElementById('finalGraphSection').style.display = 'none';
        updateGraph();
        document.getElementById('processForm').reset();
        updateProcessTable([]);
    });
});

function updateGraph() {
    fetch('/get_graph_data')
    .then(response => response.json())
    .then(data => {
        const options = {
            nodes: { shape: 'box', font: { size: 16 } },
            edges: { arrows: 'to', font: { align: 'middle' } },
            groups: {
                process: { color: { background: '#cce5ff', border: '#0066cc' } },
                resource: { color: { background: '#ccffcc', border: '#009900' } }
            }
        };
        new vis.Network(document.getElementById('currentGraph'), data, options);
    });
}

function updateProcessTable(processes) {
    const tbody = document.getElementById('processTableBody');
    tbody.innerHTML = '';
    processes.forEach(proc => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="py-2">${proc.id}</td>
            <td class="py-2">${proc.alloc[0]}</td>
            <td class="py-2">${proc.alloc[1]}</td>
            <td class="py-2">${proc.alloc[2]}</td>
        `;
        tbody.appendChild(row);
    });
}

updateGraph();
