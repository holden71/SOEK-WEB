"""
Database utilities for common operations
"""
from sqlalchemy import text
from fastapi import HTTPException


def insert_file_with_returning(db, file_type_id: int, file_name: str, file_bytes: bytes,
                              descr: str = None, sh_descr: str = None) -> int:
    """
    Insert file into SRTN_FILES table and return the FILE_ID.
    Uses Oracle Sequence for reliable ID generation.

    Args:
        db: Database session
        file_type_id: ID of file type
        file_name: Name of the file
        file_bytes: File content as bytes
        descr: File description (optional)
        sh_descr: Short description (optional)

    Returns:
        int: The FILE_ID assigned by the database
    """

    # STEP 1: Get next ID from Oracle Sequence
    try:
        # Try to get next value from sequence
        print("DEBUG: Getting next FILE_ID from Oracle sequence...")
        next_id_result = db.execute(text("SELECT SRTN_FILES_SEQ.NEXTVAL FROM DUAL"))
        next_id = next_id_result.scalar()
        print(f"DEBUG: Got FILE_ID from sequence: {next_id}")

    except Exception as e:
        print(f"DEBUG: Sequence failed ({e}), creating sequence and retrying...")
        try:
            # Create sequence if it doesn't exist
            max_id = db.execute(text("SELECT NVL(MAX(FILE_ID), 0) FROM SRTN_FILES")).scalar()
            db.execute(text(f"""
                CREATE SEQUENCE SRTN_FILES_SEQ
                START WITH {max_id + 1}
                INCREMENT BY 1
                NOCACHE
                NOCYCLE
            """))
            print(f"DEBUG: Created SRTN_FILES_SEQ starting from {max_id + 1}")
            
            # Get next value from newly created sequence
            next_id_result = db.execute(text("SELECT SRTN_FILES_SEQ.NEXTVAL FROM DUAL"))
            next_id = next_id_result.scalar()
            print(f"DEBUG: Got FILE_ID from new sequence: {next_id}")

        except Exception as e2:
            print(f"DEBUG: Sequence creation failed ({e2}), using MAX+1 fallback...")
            # Final fallback: MAX + 1 but with proper logic for empty tables
            max_result = db.execute(text("SELECT NVL(MAX(FILE_ID), 0) FROM SRTN_FILES")).scalar()
            next_id = max_result + 1
            print(f"DEBUG: Using MAX+1 fallback, FILE_ID: {next_id}")

    # STEP 2: Insert file with explicit ID
    print(f"DEBUG: Inserting file with FILE_ID: {next_id}")
    insert_query = text("""
        INSERT INTO SRTN_FILES (FILE_ID, FILE_TYPE_ID, FILE_NAME, DESCR, DATA, SH_DESCR)
        VALUES (:file_id, :file_type_id, :file_name, :descr, :data, :sh_descr)
    """)

    db.execute(insert_query, {
        "file_id": next_id,
        "file_type_id": file_type_id,
        "file_name": file_name,
        "descr": descr,
        "data": file_bytes,
        "sh_descr": sh_descr
    })

    print(f"SUCCESS: File inserted with FILE_ID: {next_id}")
    return next_id


def insert_model_with_returning(db, sh_name: str, descr: str = None, model_file_id: int = None) -> int:
    """
    Insert 3D model into SRTN_3D_MODELS table and return the MODEL_ID.
    Uses Oracle Sequence for reliable ID generation.

    Args:
        db: Database session
        sh_name: Short name of the model
        descr: Model description (optional)
        model_file_id: ID of associated file (optional)

    Returns:
        int: The MODEL_ID assigned by the database
    """

    # STEP 1: Get next ID from Oracle Sequence
    try:
        # Try to get next value from sequence
        print("DEBUG: Getting next MODEL_ID from Oracle sequence...")
        next_id_result = db.execute(text("SELECT SRTN_3D_MODELS_SEQ.NEXTVAL FROM DUAL"))
        next_id = next_id_result.scalar()
        print(f"DEBUG: Got MODEL_ID from sequence: {next_id}")

    except Exception as e:
        print(f"DEBUG: Sequence failed ({e}), creating sequence and retrying...")
        try:
            # Create sequence if it doesn't exist
            max_id = db.execute(text("SELECT NVL(MAX(MODEL_ID), 0) FROM SRTN_3D_MODELS")).scalar()
            db.execute(text(f"""
                CREATE SEQUENCE SRTN_3D_MODELS_SEQ
                START WITH {max_id + 1}
                INCREMENT BY 1
                NOCACHE
                NOCYCLE
            """))
            print(f"DEBUG: Created SRTN_3D_MODELS_SEQ starting from {max_id + 1}")
            
            # Get next value from newly created sequence
            next_id_result = db.execute(text("SELECT SRTN_3D_MODELS_SEQ.NEXTVAL FROM DUAL"))
            next_id = next_id_result.scalar()
            print(f"DEBUG: Got MODEL_ID from new sequence: {next_id}")

        except Exception as e2:
            print(f"DEBUG: Sequence creation failed ({e2}), using MAX+1 fallback...")
            # Final fallback: MAX + 1 but with proper logic for empty tables
            max_result = db.execute(text("SELECT NVL(MAX(MODEL_ID), 0) FROM SRTN_3D_MODELS")).scalar()
            next_id = max_result + 1
            print(f"DEBUG: Using MAX+1 fallback, MODEL_ID: {next_id}")

    # STEP 2: Insert model with explicit ID
    print(f"DEBUG: Inserting 3D model with MODEL_ID: {next_id}, FILE_ID: {model_file_id}")
    insert_query = text("""
        INSERT INTO SRTN_3D_MODELS (MODEL_ID, SH_NAME, DESCR, MODEL_FILE_ID)
        VALUES (:model_id, :sh_name, :descr, :model_file_id)
    """)

    db.execute(insert_query, {
        "model_id": next_id,
        "sh_name": sh_name,
        "descr": descr,
        "model_file_id": model_file_id
    })

    print(f"SUCCESS: 3D Model inserted with MODEL_ID: {next_id}")
    return next_id
