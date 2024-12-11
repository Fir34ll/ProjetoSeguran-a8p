document.addEventListener('DOMContentLoaded', function() {
    // Botão de geração de chaves RSA
    const generateRSABtn = document.getElementById('generateRSA');
    if (generateRSABtn) {
        generateRSABtn.addEventListener('click', async function() {
            try {
                const response = await fetch('/step1', {
                    method: 'POST'
                });
                const data = await response.json();
                
                if (data.status === 'success') {
                    document.getElementById('rsaKeys').style.display = 'block';
                    document.getElementById('publicKey').value = data.public_key;
                    document.getElementById('privateKey').value = data.private_key;
                }
            } catch (error) {
                console.error('Erro ao gerar chaves:', error);
                alert('Erro ao gerar chaves RSA');
            }
        });
    }

    // Botão de geração de chave AES
    const generateAESBtn = document.getElementById('generateAES');
    if (generateAESBtn) {
        generateAESBtn.addEventListener('click', async function() {
            try {
                const response = await fetch('/generate-aes', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                const data = await response.json();
                
                if (data.status === 'success') {
                    document.getElementById('aesKey').style.display = 'block';
                    document.getElementById('symmetricKey').value = data.aes_key;
                } else {
                    throw new Error(data.message || 'Erro ao gerar chave AES');
                }
            } catch (error) {
                console.error('Erro ao gerar chave AES:', error);
                alert(error.message || 'Erro ao gerar chave AES. Verifique o console para mais detalhes.');
            }
        });
    }

    // Se estiver na página step3, atualizar as informações do processo
    if (window.location.pathname === '/step3') {
        updateProcessInfo();
    }
});

// Função para download das chaves RSA
function downloadKeys() {
    const publicKey = document.getElementById('publicKey').value;
    const privateKey = document.getElementById('privateKey').value;
    
    // Download da chave pública
    downloadFile('public_key.pem', publicKey);
    // Download da chave privada
    downloadFile('private_key.pem', privateKey);
}

// Função para download da chave AES
function downloadAESKey() {
    const aesKey = document.getElementById('symmetricKey').value;
    downloadFile('aes_key.key', aesKey);
}

// Função auxiliar para download de arquivos
function downloadFile(filename, content) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

// Função para navegar para a próxima etapa
function proceedToStep2() {
    window.location.href = '/step2';
}

// Manipulação de arquivos na Step 2
document.addEventListener('DOMContentLoaded', function() {
    const recipientKeyFile = document.getElementById('recipientKeyFile');
    const fileToEncrypt = document.getElementById('fileToEncrypt');
    
    if (recipientKeyFile) {
        recipientKeyFile.addEventListener('change', handleRecipientKeyUpload);
    }
    
    if (fileToEncrypt) {
        fileToEncrypt.addEventListener('change', handleFileUpload);
    }
});

async function handleRecipientKeyUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    document.getElementById('selectedKeyFileName').textContent = file.name;
    
    try {
        const content = await readFileContent(file);
        document.getElementById('recipientKeyDisplay').style.display = 'block';
        document.getElementById('recipientKey').value = content;
        
        // Armazenar a chave do destinatário
        await fetch('/store-recipient-key', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ key: content })
        });
    } catch (error) {
        console.error('Erro ao ler a chave:', error);
        alert('Erro ao ler o arquivo da chave');
    }
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    document.getElementById('selectedFileName').textContent = file.name;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/step2', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            document.getElementById('fileContent').style.display = 'block';
            if (data.content) {
                document.getElementById('filePreview').value = data.content;
            } else {
                document.getElementById('filePreview').value = '(Arquivo binário)';
            }
            document.getElementById('fileHash').value = data.hash;
        }
    } catch (error) {
        console.error('Erro ao processar arquivo:', error);
        alert('Erro ao processar o arquivo');
    }
}

function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

function proceedToStep3() {
    window.location.href = '/step3';
}

// Adicione esta nova função
function downloadPublicKeyOnly() {
    const publicKey = document.getElementById('publicKey').value;
    downloadFile('public_key.pem', publicKey);
}

// Funções para Step 3
async function startSigningProcess() {
    try {
        const response = await fetch('/sign-file', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            updateSignatureStatus('✅');
            updateProgress('signatureProgress', 100);
            updateProcessInfo();
            checkProcessCompletion();
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Erro na assinatura:', error);
        updateSignatureStatus('❌');
        alert('Erro ao assinar o arquivo');
    }
}

async function startEncryptionProcess() {
    try {
        const response = await fetch('/encrypt-file', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            updateEncryptionStatus('✅');
            updateProgress('encryptionProgress', 100);
            checkProcessCompletion();
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Erro na cifragem:', error);
        updateEncryptionStatus('❌');
        alert('Erro ao cifrar o arquivo');
    }
}

function updateSignatureStatus(icon) {
    document.getElementById('signatureStatus').textContent = icon;
}

function updateEncryptionStatus(icon) {
    document.getElementById('encryptionStatus').textContent = icon;
}

function updateProgress(elementId, percentage) {
    document.getElementById(elementId).style.width = `${percentage}%`;
}

function checkProcessCompletion() {
    const signatureProgress = document.getElementById('signatureProgress').style.width;
    const encryptionProgress = document.getElementById('encryptionProgress').style.width;
    
    if (signatureProgress === '100%' && encryptionProgress === '100%') {
        document.getElementById('nextStepBtn').disabled = false;
    }
}

function proceedToStep4() {
    window.location.href = '/step4';
}

// Adicione esta função para atualizar as informações do processo
function updateProcessInfo() {
    // Recuperar informações da sessão via fetch
    fetch('/get-process-info')
        .then(response => response.json())
        .then(data => {
            document.getElementById('originalFileName').textContent = data.filename || '-';
            document.getElementById('fileSize').textContent = data.filesize || '-';
            document.getElementById('fileHash').textContent = data.hash || '-';
        })
        .catch(error => {
            console.error('Erro ao recuperar informações:', error);
        });
}

// Função para cifrar a chave AES
async function startKeyEncryption() {
    try {
        const response = await fetch('/encrypt-aes-key', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            // Atualizar status e progresso
            document.getElementById('keyEncryptionStatus').textContent = '✅';
            document.getElementById('keyEncryptionProgress').style.width = '100%';
            
            // Atualizar informações de tamanho
            document.getElementById('originalKeySize').textContent = `${data.original_size} bytes`;
            document.getElementById('encryptedKeySize').textContent = `${data.encrypted_size} bytes`;
            
            // Habilitar botão de próxima etapa
            document.getElementById('nextStepBtn').disabled = false;
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Erro na cifragem da chave:', error);
        document.getElementById('keyEncryptionStatus').textContent = '❌';
        alert('Erro ao cifrar a chave AES');
    }
}

function proceedToStep5() {
    window.location.href = '/step5';
}

// Funções para Step 5
async function startPackaging() {
    try {
        const response = await fetch('/package-file', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            // Atualizar status dos itens
            document.getElementById('fileStatus').textContent = '✅';
            document.getElementById('keyStatus').textContent = '✅';
            document.getElementById('signatureStatus').textContent = '✅';
            
            // Habilitar botões
            document.getElementById('downloadBtn').disabled = false;
            document.getElementById('nextStepBtn').disabled = false;
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Erro no empacotamento:', error);
        alert('Erro ao empacotar os elementos');
    }
}

function downloadFinalPackage() {
    // Implementar download do pacote final
    fetch('/download-package')
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'encrypted_package.zip';
            a.click();
        })
        .catch(error => {
            console.error('Erro no download:', error);
            alert('Erro ao baixar o pacote');
        });
}

// Funções para Step 6
async function verifySignature() {
    const fileInput = document.getElementById('recipientPrivateKeyFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Por favor, selecione o arquivo de chave privada do destinatário');
        return;
    }
    
    try {
        const privateKey = await readFileContent(file);
        
        const response = await fetch('/verify-signature', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ private_key: privateKey })
        });
        
        const data = await response.json();
        
        if (response.ok && data.status === 'success') {
            document.getElementById('verificationStatus').textContent = '✅';
            document.getElementById('decryptBtn').disabled = false;
            alert('Assinatura verificada com sucesso!');
        } else {
            throw new Error(data.message || 'Erro na verificação da assinatura');
        }
    } catch (error) {
        console.error('Erro na verificação:', error);
        document.getElementById('verificationStatus').textContent = '❌';
        alert(error.message || 'Erro ao verificar a assinatura');
    }
}

async function startDecryption() {
    const packageFileInput = document.getElementById('encryptedPackageFile');
    const file = packageFileInput.files[0];
    
    if (!file) {
        alert('Por favor, selecione o arquivo .zip');
        return;
    }
    
    try {
        // Mostrar a visualização do processo
        document.getElementById('processVisualization').style.display = 'block';
        
        // Atualizar status do Passo 1
        updateProcessStep('step1', 'active');
        await sleep(1000); // Delay para visualização
        updateProcessStep('step1', 'completed');
        
        const formData = new FormData();
        formData.append('package', file);
        
        // Atualizar status do Passo 2
        updateProcessStep('step2', 'active');
        await sleep(1000);
        updateProcessStep('step2', 'completed');
        
        const response = await fetch('/decrypt-file', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            // Atualizar status do Passo 3
            updateProcessStep('step3', 'active');
            await sleep(1000);
            updateProcessStep('step3', 'completed');
            
            // Atualizar status do Passo 4
            updateProcessStep('step4', 'active');
            await sleep(1000);
            updateProcessStep('step4', 'completed');
            
            document.getElementById('decryptionStatus').textContent = '✅';
            document.getElementById('resultSection').style.display = 'block';
            const decryptedContent = document.getElementById('decryptedContent');
            decryptedContent.value = data.content;
            decryptedContent.dataset.filename = data.filename;
        } else {
            throw new Error(data.message || 'Erro na descriptografia');
        }
    } catch (error) {
        console.error('Erro na descriptografia:', error);
        document.getElementById('decryptionStatus').textContent = '❌';
        alert(error.message || 'Erro ao descriptografar o arquivo');
    }
}

// Função auxiliar para atualizar o status de cada passo
function updateProcessStep(stepId, status) {
    const step = document.getElementById(stepId);
    if (status === 'active') {
        step.classList.add('active');
        step.classList.remove('completed');
        step.querySelector('.step-status').textContent = '⏳';
    } else if (status === 'completed') {
        step.classList.remove('active');
        step.classList.add('completed');
        step.querySelector('.step-status').textContent = '✅';
    }
}

// Função auxiliar para criar delays
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Funções de navegação entre etapas
function proceedToStep2() {
    window.location.href = '/step2';
}

function proceedToStep3() {
    window.location.href = '/step3';
}

function proceedToStep4() {
    window.location.href = '/step4';
}

function proceedToStep5() {
    window.location.href = '/step5';
}

function proceedToStep6() {
    window.location.href = '/step6';
}

function downloadPrivateKeyOnly() {
    const privateKey = document.getElementById('privateKey').value;
    if (privateKey) {
        downloadFile('private_key.pem', privateKey);
    }
}

// Adicione este código para mostrar o nome do arquivo selecionado
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('recipientPrivateKeyFile');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const fileName = e.target.files[0]?.name || 'Nenhum arquivo selecionado';
            document.getElementById('selectedKeyFileName').textContent = fileName;
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const packageFileInput = document.getElementById('encryptedPackageFile');
    if (packageFileInput) {
        packageFileInput.addEventListener('change', function(e) {
            const fileName = e.target.files[0]?.name || 'Nenhum arquivo selecionado';
            document.getElementById('selectedPackageFileName').textContent = fileName;
            document.getElementById('decryptBtn').disabled = !e.target.files.length;
        });
    }
});

function downloadOriginalFile() {
    const content = document.getElementById('decryptedContent').value;
    const filename = document.getElementById('decryptedContent').dataset.filename || 'arquivo_original.txt';
    
    if (content) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
}
