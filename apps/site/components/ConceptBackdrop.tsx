import Image from 'next/image'
import styles from './ConceptBackdrop.module.css'

export function ConceptBackdrop() {
  return (
    <div className="concept-backdrop" aria-hidden="true">
      <Image
        src="/images/concept-architecture.png"
        alt=""
        fill
        sizes="100vw"
        quality={75}
        preload
        className={styles.image}
      />
    </div>
  )
}
