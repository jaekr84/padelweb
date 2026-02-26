import styles from "./social.module.css";

interface PostCardProps {
    author: {
        name: string;
        username: string;
        avatar?: string;
        role: "jugador" | "club" | "profesor" | "organizador";
    };
    content: string;
    timeAgo: string;
    likes: number;
    comments: number;
}

export default function PostCard({ author, content, timeAgo, likes, comments }: PostCardProps) {

    const getRoleIcon = (role: string) => {
        switch (role) {
            case "jugador": return "🎾";
            case "club": return "🏟️";
            case "profesor": return "🎓";
            case "organizador": return "🏆";
            default: return "👤";
        }
    };

    return (
        <article className={styles.postCard}>
            <div className={styles.avatar}>
                {author.avatar ? <img src={author.avatar} alt={author.name} style={{ width: '100%', borderRadius: '50%' }} /> : getRoleIcon(author.role)}
            </div>
            <div className={styles.postContent}>
                <div className={styles.postHeader}>
                    <span className={styles.authorName}>{author.name}</span>
                    <span className={styles.authorUsername}>@{author.username}</span>
                    <span style={{ color: "var(--text-muted)" }}>•</span>
                    <span className={styles.postTime}>{timeAgo}</span>
                </div>

                <div className={styles.postText}>
                    {content}
                </div>

                <div className={styles.postActions}>
                    <button className={styles.actionButton}>
                        <span className={styles.iconBg}>💬</span> {comments}
                    </button>
                    <button className={styles.actionButton}>
                        <span className={styles.iconBg}>🔃</span>
                    </button>
                    <button className={styles.actionButton}>
                        <span className={styles.iconBg}>🎾</span> {likes}
                    </button>
                    <button className={styles.actionButton}>
                        <span className={styles.iconBg}>🔗</span>
                    </button>
                </div>
            </div>
        </article>
    );
}
