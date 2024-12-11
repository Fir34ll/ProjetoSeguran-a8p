from Crypto.PublicKey import RSA
from Crypto.Cipher import AES, PKCS1_OAEP
from Crypto.Signature import pkcs1_15
from Crypto.Hash import SHA256
from Crypto.Random import get_random_bytes
import os

class CryptoOperations:
    @staticmethod
    def generate_rsa_keys():
        key = RSA.generate(2048)
        private_key = key.export_key()
        public_key = key.publickey().export_key()
        return private_key, public_key
    
    @staticmethod
    def generate_aes_key():
        return get_random_bytes(32)
    
    @staticmethod
    def sign_file(private_key, file_data):
        key = RSA.import_key(private_key)
        h = SHA256.new(file_data)
        signature = pkcs1_15.new(key).sign(h)
        return signature
    
    @staticmethod
    def encrypt_file(data, aes_key):
        cipher = AES.new(aes_key, AES.MODE_EAX)
        nonce = cipher.nonce
        ciphertext, tag = cipher.encrypt_and_digest(data)
        return (nonce, ciphertext, tag)
    
    @staticmethod
    def encrypt_aes_key(aes_key, public_key):
        recipient_key = RSA.import_key(public_key)
        cipher_rsa = PKCS1_OAEP.new(recipient_key)
        encrypted_aes_key = cipher_rsa.encrypt(aes_key)
        return encrypted_aes_key
    
    @staticmethod
    def calculate_hash(data):
        """Calcula o hash SHA-256 dos dados"""
        hash_obj = SHA256.new(data)
        return hash_obj.hexdigest()
    
    @staticmethod
    def verify_signature(private_key, file_data, signature):
        try:
            # Importar a chave privada
            key = RSA.import_key(private_key)
            # Calcular o hash do arquivo
            h = SHA256.new(file_data)
            
            try:
                # Verificar a assinatura
                pkcs1_15.new(key).verify(h, signature)
                return True
            except (ValueError, TypeError):
                print("Erro na verificação da assinatura")
                return False
        except Exception as e:
            print(f"Erro ao verificar assinatura: {str(e)}")
            return False
    
    @staticmethod
    def decrypt_aes_key(encrypted_aes_key, private_key):
        key = RSA.import_key(private_key)
        cipher_rsa = PKCS1_OAEP.new(key)
        aes_key = cipher_rsa.decrypt(encrypted_aes_key)
        return aes_key
    
    @staticmethod
    def decrypt_file(encrypted_file, aes_key):
        nonce, ciphertext, tag = encrypted_file['nonce'], encrypted_file['ciphertext'], encrypted_file['tag']
        cipher = AES.new(aes_key, AES.MODE_EAX, nonce=nonce)
        original_file = cipher.decrypt_and_verify(ciphertext, tag)
        return original_file
