from flask import Blueprint, render_template, request, session, jsonify, send_file
from .crypto import CryptoOperations
import base64
import os
import logging
import zipfile
import io
import json

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

main = Blueprint('main', __name__)

@main.route('/')
def index():
    return render_template('index.html', active_step=0)

@main.route('/step1', methods=['GET', 'POST'])
def step1():
    if request.method == 'POST':
        private_key, public_key = CryptoOperations.generate_rsa_keys()
        aes_key = CryptoOperations.generate_aes_key()
        
        session['private_key'] = base64.b64encode(private_key).decode('utf-8')
        session['public_key'] = base64.b64encode(public_key).decode('utf-8')
        session['aes_key'] = base64.b64encode(aes_key).decode('utf-8')
        
        return jsonify({
            'status': 'success',
            'public_key': public_key.decode(),
            'private_key': private_key.decode()
        })
    
    return render_template('step1.html', active_step=1)

@main.route('/generate-aes', methods=['POST'])
def generate_aes():
    try:
        aes_key = CryptoOperations.generate_aes_key()
        
        aes_key_b64 = base64.b64encode(aes_key).decode('utf-8')
        
        session['aes_key'] = aes_key_b64
        
        return jsonify({
            'status': 'success',
            'aes_key': aes_key_b64
        })
    except Exception as e:
        print(f"Erro ao gerar chave AES: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f"Erro ao gerar chave AES: {str(e)}"
        }), 500

@main.route('/step2', methods=['GET', 'POST'])
def step2():
    if request.method == 'POST':
        try:
            file = request.files['file']
            file_content = file.read()
            file_hash = CryptoOperations.calculate_hash(file_content)
            
            # Armazenar na sessão
            session['original_file'] = base64.b64encode(file_content).decode('utf-8')
            session['file_hash'] = file_hash
            
            return jsonify({
                'status': 'success',
                'content': file_content.decode('utf-8') if is_text_file(file.filename) else None,
                'hash': file_hash
            })
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': str(e)
            }), 500
    
    return render_template('step2.html', active_step=2)

@main.route('/store-recipient-key', methods=['POST'])
def store_recipient_key():
    try:
        data = request.get_json()
        recipient_key = data.get('key')
        
        # Armazenar a chave pública do destinatário na sessão
        session['recipient_public_key'] = recipient_key
        
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

def is_text_file(filename):
    text_extensions = {'.txt', '.csv', '.json', '.xml', '.html', '.md'}
    return any(filename.lower().endswith(ext) for ext in text_extensions)

@main.route('/step3', methods=['GET', 'POST'])
def step3():
    return render_template('step3.html', active_step=3)

@main.route('/sign-file', methods=['POST'])
def sign_file():
    try:
        # Recuperar o arquivo e a chave privada da sessão
        file_content = base64.b64decode(session.get('original_file', ''))
        private_key = base64.b64decode(session.get('private_key', ''))
        
        # Assinar o arquivo
        signature = CryptoOperations.sign_file(private_key, file_content)
        
        # Armazenar a assinatura na sessão
        session['signature'] = base64.b64encode(signature).decode('utf-8')
        
        return jsonify({'status': 'success'})
    except Exception as e:
        print(f"Erro na assinatura: {str(e)}")  # Log do erro
        return jsonify({
            'status': 'error',
            'message': f'Erro ao assinar arquivo: {str(e)}'
        }), 500

@main.route('/encrypt-file', methods=['POST'])
def encrypt_file():
    try:
        # Recuperar o arquivo e a chave AES da sessão
        file_content = base64.b64decode(session.get('original_file', ''))
        aes_key = base64.b64decode(session.get('aes_key', ''))
        
        # Cifrar o arquivo
        nonce, ciphertext, tag = CryptoOperations.encrypt_file(file_content, aes_key)
        
        # Armazenar os dados cifrados na sessão
        session['encrypted_file'] = {
            'nonce': base64.b64encode(nonce).decode('utf-8'),
            'ciphertext': base64.b64encode(ciphertext).decode('utf-8'),
            'tag': base64.b64encode(tag).decode('utf-8')
        }
        
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@main.route('/get-process-info')
def get_process_info():
    try:
        # Recuperar informações da sessão
        file_content = base64.b64decode(session.get('original_file', ''))
        file_hash = session.get('file_hash', '')
        
        # Calcular o tamanho do arquivo
        file_size = len(file_content)
        size_str = f"{file_size} bytes"
        if file_size > 1024:
            size_str = f"{file_size/1024:.2f} KB"
        if file_size > 1024*1024:
            size_str = f"{file_size/(1024*1024):.2f} MB"
        
        return jsonify({
            'filename': session.get('filename', 'Arquivo carregado'),
            'filesize': size_str,
            'hash': file_hash
        })
    except Exception as e:
        return jsonify({
            'filename': '-',
            'filesize': '-',
            'hash': '-'
        })

@main.route('/step4')
def step4():
    return render_template('step4.html', active_step=4)

@main.route('/encrypt-aes-key', methods=['POST'])
def encrypt_aes_key():
    try:
        # Recuperar as chaves da sessão
        aes_key = base64.b64decode(session.get('aes_key', ''))
        recipient_public_key = session.get('recipient_public_key', '')
        
        # Cifrar a chave AES
        encrypted_aes_key = CryptoOperations.encrypt_aes_key(aes_key, recipient_public_key)
        
        # Armazenar a chave cifrada na sessão
        session['encrypted_aes_key'] = base64.b64encode(encrypted_aes_key).decode('utf-8')
        
        return jsonify({
            'status': 'success',
            'original_size': len(aes_key),
            'encrypted_size': len(encrypted_aes_key)
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@main.route('/step5')
def step5():
    return render_template('step5.html', active_step=5)

@main.route('/step6')
def step6():
    return render_template('step6.html', active_step=6)

@main.route('/package-file', methods=['POST'])
def package_file():
    try:
        # Recuperar todos os elementos da sessão
        encrypted_file = session.get('encrypted_file', {})
        encrypted_aes_key = session.get('encrypted_aes_key', '')
        signature = session.get('signature', '')
        
        # Criar o pacote final
        final_package = {
            'encrypted_file': encrypted_file,
            'encrypted_aes_key': encrypted_aes_key,
            'signature': signature
        }
        
        # Armazenar o pacote na sessão
        session['final_package'] = final_package
        
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@main.route('/verify-signature', methods=['POST'])
def verify_signature():
    try:
        data = request.get_json()
        private_key = data.get('private_key')
        
        logger.debug("Chave privada recebida")
        
        original_file = base64.b64decode(session.get('original_file', ''))
        signature = base64.b64decode(session.get('signature', ''))
        
        logger.debug(f"Tamanho do arquivo original: {len(original_file)}")
        logger.debug(f"Tamanho da assinatura: {len(signature)}")
        
        is_valid = CryptoOperations.verify_signature(private_key, original_file, signature)
        
        logger.debug(f"Resultado da verificação: {is_valid}")
        
        if is_valid:
            return jsonify({'status': 'success'})
        else:
            return jsonify({'status': 'error', 'message': 'Assinatura inválida'}), 400
    except Exception as e:
        logger.error(f"Erro na verificação: {str(e)}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': f'Erro ao verificar assinatura: {str(e)}'
        }), 500

@main.route('/decrypt-file', methods=['POST'])
def decrypt_file():
    try:
        # Recuperar o arquivo .zip do request
        package_file = request.files['package']
        
        # Ler o conteúdo do arquivo em um buffer de memória
        file_content = package_file.read()
        memory_file = io.BytesIO(file_content)
        
        # Verificar se o arquivo é um zip válido
        if not zipfile.is_zipfile(memory_file):
            return jsonify({'status': 'error', 'message': 'O arquivo enviado não é um arquivo zip válido.'}), 400
        
        # Abrir o arquivo .zip
        with zipfile.ZipFile(memory_file) as z:
            # Extrair e processar o arquivo cifrado
            encrypted_file_data = json.loads(z.read('encrypted_file.json').decode('utf-8'))
            encrypted_file = {
                'nonce': base64.b64decode(encrypted_file_data['nonce']),
                'ciphertext': base64.b64decode(encrypted_file_data['ciphertext']),
                'tag': base64.b64decode(encrypted_file_data['tag'])
            }
            
            # Extrair a chave AES cifrada e a assinatura
            encrypted_aes_key = z.read('encrypted_aes_key.bin')
            signature = z.read('signature.bin')
        
        # Recuperar a chave privada do destinatário
        private_key = base64.b64decode(session.get('private_key', ''))
        
        # Descriptografar a chave AES
        aes_key = CryptoOperations.decrypt_aes_key(encrypted_aes_key, private_key)
        
        # Descriptografar o arquivo
        original_file = CryptoOperations.decrypt_file(encrypted_file, aes_key)
        
        # Verificar a assinatura
        is_valid = CryptoOperations.verify_signature(private_key, original_file, signature)
        
        if not is_valid:
            return jsonify({'status': 'error', 'message': 'Assinatura inválida'}), 400
        
        # Adicionar o nome original do arquivo na resposta
        return jsonify({
            'status': 'success', 
            'content': original_file.decode('utf-8'),
            'filename': session.get('original_filename', 'arquivo_original.txt')
        })
    except Exception as e:
        print(f"Erro na descriptografia: {str(e)}")  # Log do erro
        return jsonify({
            'status': 'error',
            'message': f'Erro ao descriptografar arquivo: {str(e)}'
        }), 500

@main.route('/download-package')
def download_package():
    try:
        # Recuperar dados da sessão
        encrypted_file = session.get('encrypted_file', {})
        encrypted_aes_key = base64.b64decode(session.get('encrypted_aes_key', ''))
        signature = base64.b64decode(session.get('signature', ''))

        # Criar um buffer de memória para o arquivo ZIP
        memory_file = io.BytesIO()
        
        # Criar o arquivo ZIP
        with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            # Adicionar arquivo cifrado como JSON string
            encrypted_file_data = {
                'nonce': encrypted_file['nonce'],  # Já está em base64
                'ciphertext': encrypted_file['ciphertext'],  # Já está em base64
                'tag': encrypted_file['tag']  # Já está em base64
            }
            zf.writestr('encrypted_file.json', json.dumps(encrypted_file_data))
            
            # Adicionar chave AES cifrada
            zf.writestr('encrypted_aes_key.bin', encrypted_aes_key)
            
            # Adicionar assinatura
            zf.writestr('signature.bin', signature)

        # Mover o ponteiro para o início do arquivo
        memory_file.seek(0)
        
        return send_file(
            memory_file,
            mimetype='application/zip',
            as_attachment=True,
            download_name='encrypted_package.zip'
        )
    except Exception as e:
        print(f"Erro ao criar pacote: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500
