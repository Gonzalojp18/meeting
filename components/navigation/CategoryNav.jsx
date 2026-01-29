import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

import Link from 'next/link';
import styles from './CategoryNav.module.css';
import { getCategoryIcon } from './CategoryIcons';

const CategoryNav = ({ categories = [] }) => {
  const [activeCategory, setActiveCategory] = useState(null);
  const scrollContainerRef = useRef(null);

  // Defensa: asegurar que categories sea un array
  const safeCategories = Array.isArray(categories) ? categories : [];

  const scrollToCategory = (categoryId) => {
    const element = document.getElementById(`category-${categoryId}`);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
    setActiveCategory(categoryId);
  };

  useEffect(() => {
    const categoriesWithElements = safeCategories.map((cat) => ({
      id: cat._id,
      element: document.getElementById(`category-${cat._id}`),
    }));

    const handleScroll = () => {
      const activeCategory = categoriesWithElements.find((cat) => {
        if (!cat.element) return false;
        const rect = cat.element.getBoundingClientRect();
        return rect.top <= 100 && rect.bottom >= 100;
      });

      if (activeCategory) {
        setActiveCategory(activeCategory.id);
        const activeButton = document.getElementById(`cat-button-${activeCategory.id}`);
        if (activeButton && scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            left: activeButton.offsetLeft - scrollContainerRef.current.offsetWidth / 2 + activeButton.offsetWidth / 2,
            behavior: 'smooth',
          });
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [safeCategories]);

  return (
    <nav className={styles.categoryNav}>
      <div className={styles.navContainer}>
        <Link href="/" className={styles.logoLink}>
          <Image src="/assets/miselaneous/meetinglogo.png" alt="Logo" className={styles.logo} width={120} height={40} />
        </Link>
        <div className={styles.scrollContainer} ref={scrollContainerRef}>
          <div className={styles.categoriesContainer}>
            {safeCategories.map((category) => (
              <button
                key={category._id}
                id={`cat-button-${category._id}`}
                onClick={() => scrollToCategory(category._id)}
                className={`${styles.categoryButton} ${activeCategory === category._id ? styles.active : ''}`}
              >
                <div className={styles.categoryIcon}>
                  {getCategoryIcon(category.name)}
                </div>
                <span className={styles.categoryName}>
                  {category.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default CategoryNav;
