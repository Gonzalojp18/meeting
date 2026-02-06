import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './TakeawayNav.module.css';

const TakeawayNav = ({ categories = [] }) => {
  const [activeCategory, setActiveCategory] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollContainerRef = useRef(null);

  const safeCategories = Array.isArray(categories) ? categories : [];
  const itemsPerPage = 5; // Visible items in mobile
  const totalPages = Math.ceil(safeCategories.length / itemsPerPage);

  const scrollToCategory = (categoryId) => {
    const element = document.getElementById(`category-${categoryId}`);
    if (element) {
      const offset = 180; // Mayor offset para el nuevo nav
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
    setActiveCategory(categoryId);
  };

  // Track scroll para actualizar página de dots
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      const scrollPercentage = scrollLeft / (scrollWidth - clientWidth);
      const newPage = Math.round(scrollPercentage * (totalPages - 1));
      setCurrentPage(Math.min(newPage, totalPages - 1));
    }
  };

  // Track scroll de la página para destacar categoría activa
  useEffect(() => {
    const categoriesWithElements = safeCategories.map((cat) => ({
      id: cat._id,
      element: document.getElementById(`category-${cat._id}`),
    }));

    const handlePageScroll = () => {
      const active = categoriesWithElements.find((cat) => {
        if (!cat.element) return false;
        const rect = cat.element.getBoundingClientRect();
        return rect.top <= 200 && rect.bottom >= 200;
      });

      if (active) {
        setActiveCategory(active.id);
      }
    };

    window.addEventListener('scroll', handlePageScroll);
    return () => window.removeEventListener('scroll', handlePageScroll);
  }, [safeCategories]);

  return (
    <nav className={styles.takeawayNav}>
      <div className={styles.navContainer}>
        {/* Logo */}
        <div className={styles.logoSection}>
          <Link href="/">
            <Image
              src="/logo.png"
              alt="Logo"
              className={styles.logo}
              width={140}
              height={50}
            />
          </Link>
        </div>

        {/* Categorías con fotos */}
        <div
          className={styles.categoriesWrapper}
          ref={scrollContainerRef}
          onScroll={handleScroll}
        >
          <div className={styles.categoriesContainer}>
            {safeCategories.map((category) => (
              <button
                key={category._id}
                onClick={() => scrollToCategory(category._id)}
                className={`${styles.categoryItem} ${activeCategory === category._id ? styles.active : ''}`}
              >
                <div className={styles.imageWrapper}>
                  {category.image?.url ? (
                    <img
                      src={category.image.url}
                      alt={category.name}
                      className={styles.categoryImage}
                    />
                  ) : (
                    <div className={styles.placeholderImage}>
                      <span>{category.name.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <span className={styles.categoryName}>{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Indicadores de página (dots) - solo mobile */}
        {totalPages > 1 && (
          <div className={styles.dotsContainer}>
            {Array.from({ length: totalPages }).map((_, index) => (
              <span
                key={index}
                className={`${styles.dot} ${currentPage === index ? styles.activeDot : ''}`}
              />
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default TakeawayNav;
