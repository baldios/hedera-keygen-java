package com.hedera.sdk.keygen;


import org.bouncycastle.util.encoders.Hex;

import java.security.NoSuchAlgorithmException;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Implements public/private(secret) key management functions
 */
public class CryptoKeyPair {

	private AbstractKeyPair keyPair = null;
	private Seed seed = null;

	/**
	 * sets the public key as a byte[]
	 */
	public void setPublicKey(byte[] publicKey) {
		keyPair.setPublicKey(publicKey);
	}

	public void setPublic(PublicKey publicKey) {
		keyPair.setPublicKey(publicKey);
	}

	/**
	 * gets the public key as a byte[]
	 * returns byte[0] if not set
	 */
	public byte[] getPublicKey() {
		return keyPair.getPublicKey();
	}
	public PublicKey getPublic() {
		return keyPair.getPublic();
	}

	public byte[] getPrivateKey() {
		return keyPair.getSecretKey();
	}
	public PrivateKey getPrivate() {
		return keyPair.getSecret();
	}
	
	/**
	 * gets the encoded public key as a byte[]
	 * returns byte[0] if not set
	 */
	public byte[] getPublicKeyEncoded() {
		if (this.keyPair != null) {
			return this.keyPair.getPublicKeyEncoded();
		} else {
			return new byte[0];
		}
	}

	public String getPublicKeyEncodedHex() {
		if (this.keyPair != null) {
			return Hex.toHexString(this.keyPair.getPublicKeyEncoded());
		} else {
			return "";
		}
	}

	public String getPublicKeyHex() {
		if (this.keyPair != null) {
			return Hex.toHexString(this.keyPair.getPublicKey());
		} else {
			return "";
		}
	}

	/**
	 * sets the secret key as a byte[]
	 */
	public void setSecretKey(byte[] secretKey) {
		keyPair.setSecretKey(secretKey);
	}

	/**
	 * gets the secret key as a byte[]
	 * returns byte[0] if not set
	 */
	public byte[] getSecretKey() {
		if (this.keyPair != null) {
			return keyPair.getSecretKey();
		} else {
			return null;
		}
	}

	public byte[] getSecretKeyEncoded() {
		if (this.keyPair != null) {
			return keyPair.getSecretKeyEncoded();
		} else {
			return null;
		}
	}

	/**
	 * gets the secret key as a String
	 * returns "" if not set
	 */
	public String getSecretKeyHex() {
		if (this.keyPair != null) {
			return Hex.toHexString(this.keyPair.getSecretKey());
		} else {
			return "";
		}
	}

	public String getSecretKeyEncodedHex() {
		if (this.keyPair != null) {
			return Hex.toHexString(this.keyPair.getSecretKeyEncoded());
		} else {
			return "";
		}
	}

	/**
	 * Constructor from a key type and recoveryWords as an array of String
	 * Creates or Recovers a public/private keypair from the list of words
	 *
	 * @param recoveryWords
	 * 		String[]
	 * @throws NoSuchAlgorithmException
	 */
	public CryptoKeyPair(String[] recoveryWords, int index) throws NoSuchAlgorithmException {
		this(Arrays.asList(recoveryWords), index);
	}

	/**
	 * Constructor from a key type and recoveryWords as an List of String
	 * Creates or Recovers a public/private keypair from the list of words
	 *
	 * @param recoveryWords
	 * @throws NoSuchAlgorithmException
	 */
	public CryptoKeyPair(List<String> recoveryWords, int index) throws NoSuchAlgorithmException {
		byte[] priv = null;

		byte[] privateKey;
		this.seed = Seed.fromWordList(recoveryWords);
		privateKey = CryptoUtils.deriveKey(seed.toBytes(), index, 32);
		keyPair = new EDKeyPair(privateKey);
	}

	/**
	 * Constructor from a key type and seed
	 *
	 * @param seed
	 * 		the seed to generate with
	 */
	public CryptoKeyPair(byte[] seed, int index) {

		byte[] priv = null;

		if (seed == null) {
			seed = CryptoUtils.getSecureRandomData(32);
		}
		byte[] privateKey;
		if (seed.length != 32) {
			throw new IllegalStateException(String.format("Seed size of %d is invalid, should be 32", seed.length));
		}
		this.seed = Seed.fromEntropy(seed);
		privateKey = CryptoUtils.deriveKey(this.seed.toBytes(), index, 32);
		keyPair = new EDKeyPair(privateKey);

	}

	/**
	 * Constructs a key pair of the given key type, the seed is randomly generated
	 *
	 * @throws NoSuchAlgorithmException
	 */
	public CryptoKeyPair(int index) {
		this((byte[]) null, index);
	}

	/**
	 * Constructs from a known pair of public and private key
	 *
	 * @param publicKey
	 * 		{@link Byte[]}
	 * @param secretKey
	 * 		{@link Byte[]}
	 */
	public CryptoKeyPair(byte[] publicKey, byte[] secretKey) {
		keyPair = new EDKeyPair(publicKey, secretKey);
	}

	/**
	 * Constructs from a known pair of public and private key
	 *
	 * @param publicKey
	 * 		{@link String} as a hex encoded string
	 * @param secretKey
	 * 		{@link String} as a hex encoded string
	 */
	public CryptoKeyPair(String publicKey, String secretKey) {
		byte[] pub = Hex.decode(publicKey);
		byte[] secret = Hex.decode(secretKey);
		keyPair = new EDKeyPair(pub, secret);
	}

	/**
	 * Returns the list of recoveryWords for a key pair
	 *
	 * @return List<String>
	 * @throws IllegalStateException
	 * 		if the key type is invalid
	 */
	public List<String> recoveryWordsList() {

		if (this.seed != null) {
			return this.seed.toWords();
		} else {
			return new ArrayList<String>();
		}
	}

	/**
	 * Returns the list of recoveryWords for a key pair
	 *
	 * @return String[]
	 * @throws IllegalStateException
	 * 		if the key type is invalid
	 */
	public String[] recoveryWordsArray() {
		List<String> wordList = new ArrayList<String>();
		if (this.seed != null) {
			wordList = this.seed.toWords();
			return wordList.toArray(new String[0]);
		} else {
			return new String[0];
		}
	}

	/**
	 * signs a message with the private key
	 *
	 * @param message
	 * 		byte[]
	 * @return byte[]
	 * @throws IllegalStateException
	 * 		if the private key is unknown or key type is not supported
	 */
	public byte[] signMessage(byte[] message) {
		return keyPair.signMessage(message);
	}

	/**
	 * verifies a message against a signature
	 *
	 * @param message
	 * 		byte[]
	 * @param signature
	 * 		byte[]
	 * @return {@link Boolean}
	 * @throws IllegalStateException
	 * 		if the private key is unknown or key type is not supported
	 */
	public boolean verifySignature(byte[] message, byte[] signature) {
		return keyPair.verifySignature(message, signature);
	}

}
