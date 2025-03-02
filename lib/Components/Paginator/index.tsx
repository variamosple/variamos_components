import { FC, useMemo } from "react";
import { Pagination } from "react-bootstrap";

export interface PaginatorProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
}

const range = (start: number, end: number) => {
  const result = [];
  for (let i = start; i <= end; i++) {
    result.push(i);
  }
  return result;
};

const pageItems = 5;

export const Paginator: FC<PaginatorProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const pages = useMemo(() => {
    if (currentPage === 1 && totalPages === 1) {
      return [];
    } else if (currentPage === 1) {
      return range(2, Math.min(totalPages - 1, pageItems + 1));
    } else if (totalPages - pageItems <= 0) {
      return range(2, totalPages - 1);
    }

    let startPage;
    let endPage;

    if (currentPage <= Math.ceil(pageItems / 2)) {
      startPage = 2;
      endPage = Math.min(pageItems + 1, totalPages - 1);
    } else if (currentPage + Math.floor(pageItems / 2) >= totalPages) {
      startPage = Math.max(totalPages - pageItems, 2);
      endPage = totalPages - 1;
    } else {
      startPage = currentPage - Math.floor(pageItems / 2);
      endPage = currentPage + Math.floor(pageItems / 2);
    }

    endPage = Math.min(endPage, totalPages - 1);

    startPage = Math.max(startPage, 2);

    return range(startPage, endPage);
  }, [currentPage, totalPages]);

  return (
    <Pagination className="d-flex justify-content-end">
      <Pagination.First
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
      />
      <Pagination.Prev
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      />

      <Pagination.Item
        active={currentPage === 1}
        onClick={() => onPageChange(1)}
      >
        1
      </Pagination.Item>

      {totalPages > 2 && !pages.includes(2) && <Pagination.Ellipsis />}

      {pages.map((page) => (
        <Pagination.Item
          key={page}
          active={currentPage === page}
          onClick={() => onPageChange(page)}
        >
          {page}
        </Pagination.Item>
      ))}

      {totalPages > pageItems && !pages.includes(totalPages - 1) && (
        <Pagination.Ellipsis />
      )}

      {totalPages > 1 && (
        <Pagination.Item
          active={currentPage === totalPages}
          onClick={() => onPageChange(totalPages)}
        >
          {totalPages}
        </Pagination.Item>
      )}

      <Pagination.Next
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      />

      <Pagination.Last
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
      />
    </Pagination>
  );
};
