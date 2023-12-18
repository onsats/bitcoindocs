import styles from './styles.module.scss';

export function OpCode({ name }) {
    return (
        <span className={`${styles.script} ${styles.opcode}`}>
            {name}
        </span>
    );
}


export function Signature({ label }) {
    return (
        <span className={`${styles.script} ${styles.signature}`}>
            Sig{label ?? ''}
        </span>
    );
}

export function PublicKey({ label }) {
    return (
        <span className={`${styles.script} ${styles.publickey}`}>
            PubKey{label ?? ''}
        </span>
    )
}

export function PublicKeyHash({ label }) {
    return (
        <span className={`${styles.script} ${styles.publickeyhash}`}>
            PubKeyHash{label ?? ''}
        </span>
    )
}
