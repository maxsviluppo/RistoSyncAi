
// --- Backup & Restore Logic ---
function setupBackupRestore() {
    const exportBtn = document.getElementById('export-data-btn');
    const importBtn = document.getElementById('import-data-btn');
    const fileInput = document.getElementById('import-file-input');

    // Export Data
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            try {
                exportBtn.disabled = true;
                exportBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Esportazione...';

                // Fetch all sales data
                const { data: sales, error } = await supabase
                    .from('sales')
                    .select('*, platforms(name)')
                    .order('sale_date', { ascending: false });

                if (error) throw error;

                // Create backup object
                const backup = {
                    version: '1.0.0',
                    exportDate: new Date().toISOString(),
                    totalSales: sales.length,
                    sales: sales
                };

                // Convert to JSON and download
                const dataStr = JSON.stringify(backup, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);

                const link = document.createElement('a');
                link.href = url;
                link.download = `stl-sales-backup-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                showToast('✅ Backup Completato', `${sales.length} vendite esportate`);
            } catch (error) {
                console.error('Export error:', error);
                showToast('❌ Errore', 'Impossibile esportare i dati');
            } finally {
                exportBtn.disabled = false;
                exportBtn.innerHTML = '<i class="fa-solid fa-file-export"></i> Esporta Backup';
            }
        });
    }

    // Import Data - Open file picker
    if (importBtn && fileInput) {
        importBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                importBtn.disabled = true;
                importBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Importazione...';

                const text = await file.text();
                const backup = JSON.parse(text);

                // Validate backup structure
                if (!backup.sales || !Array.isArray(backup.sales)) {
                    throw new Error('Formato backup non valido');
                }

                // Ask for confirmation
                const confirmed = confirm(
                    `Vuoi importare ${backup.sales.length} vendite?\n\n` +
                    `ATTENZIONE: Questa operazione aggiungerà i dati al database esistente.`
                );

                if (!confirmed) {
                    showToast('ℹ️ Annullato', 'Importazione annullata');
                    return;
                }

                // Import sales (skip duplicates based on email_subject)
                let imported = 0;
                let skipped = 0;

                for (const sale of backup.sales) {
                    // Check if sale already exists
                    const { data: existing } = await supabase
                        .from('sales')
                        .select('id')
                        .eq('email_subject', sale.email_subject)
                        .single();

                    if (existing) {
                        skipped++;
                        continue;
                    }

                    // Insert sale (remove id and platforms object)
                    const { id, platforms, ...saleData } = sale;
                    const { error } = await supabase
                        .from('sales')
                        .insert([saleData]);

                    if (!error) {
                        imported++;
                    } else {
                        console.error('Import error for sale:', error);
                        skipped++;
                    }
                }

                showToast('✅ Importazione Completata', `${imported} vendite importate, ${skipped} duplicate saltate`);

                // Reload dashboard
                await loadDashboardData();

            } catch (error) {
                console.error('Import error:', error);
                showToast('❌ Errore', 'Impossibile importare i dati: ' + error.message);
            } finally {
                importBtn.disabled = false;
                importBtn.innerHTML = '<i class="fa-solid fa-file-import"></i> Importa Backup';
                fileInput.value = ''; // Reset file input
            }
        });
    }
}
