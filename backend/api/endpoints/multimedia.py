"""
Multimedia API endpoints
"""
from typing import List
from sqlalchemy import text
from fastapi import APIRouter, HTTPException

from api.dependencies import DbSessionDep
from services import Model3DService

router = APIRouter(prefix="/api", tags=["multimedia"])
model_3d_service = Model3DService()


@router.get("/multimedia", response_model=List[dict])
async def get_all_multimedia(db: DbSessionDep):
    """Get all multimedia files"""
    return model_3d_service.get_all_multimedia(db)


@router.delete("/multimedia/{multimed_id}")
async def delete_multimedia(db: DbSessionDep, multimed_id: int):
    """Delete multimedia file by ID"""
    try:
        result = model_3d_service.delete_multimedia(db, multimed_id)
        db.commit()
        return result
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting multimedia: {str(e)}")


@router.get("/multimedia/model/{model_id}")
async def get_multimedia_by_model(db: DbSessionDep, model_id: int):
    """Get all multimedia files for a specific model"""
    try:
        import base64
        from models import MultimediaModel, File, FileType

        query = (
            db.query(
                MultimediaModel.MULTIMED_3D_ID,
                MultimediaModel.SH_NAME,
                MultimediaModel.MULTIMED_FILE_ID,
                File.FILE_NAME,
                File.DATA,
                FileType.NAME.label('FILE_TYPE_NAME'),
                FileType.DEF_EXT.label('FILE_EXT')
            )
            .join(File, MultimediaModel.MULTIMED_FILE_ID == File.FILE_ID)
            .join(FileType, File.FILE_TYPE_ID == FileType.FILE_TYPE_ID)
            .filter(MultimediaModel.MODEL_ID == model_id)
        )

        results = query.all()

        # Helper function to determine file type
        def is_image_ext(ext):
            image_exts = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff'}
            return ext.lower() in image_exts

        def is_pdf_ext(ext):
            return ext.lower() == '.pdf'

        multimedia_data = []
        for row in results:
            file_ext = row.FILE_EXT or ''
            # Convert binary content to base64
            file_content_base64 = base64.b64encode(row.DATA).decode('utf-8') if row.DATA else None

            multimedia_data.append({
                "MULTIMED_3D_ID": row.MULTIMED_3D_ID,
                "SH_NAME": row.SH_NAME,
                "MULTIMED_FILE_ID": row.MULTIMED_FILE_ID,
                "FILE_NAME": row.FILE_NAME,
                "FILE_TYPE_NAME": row.FILE_TYPE_NAME,
                "FILE_EXT": file_ext,
                "FILE_EXTENSION": file_ext,
                "FILE_CONTENT_BASE64": file_content_base64,
                "IS_IMAGE": is_image_ext(file_ext),
                "IS_PDF": is_pdf_ext(file_ext),
                "MULTIMEDIA_NAME": row.SH_NAME
            })

        return multimedia_data

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching multimedia for model {model_id}: {str(e)}"
        )


@router.get("/multimedia/model/{model_id}/check")
async def check_multimedia(db: DbSessionDep, model_id: int):
    """Check if multimedia exists for model"""
    try:
        query = text("""
            SELECT COUNT(*) as multimedia_count
            FROM SRTN_MULTIMED_3D_MODELS mm
            WHERE mm.MODEL_ID = :model_id
        """)

        result = db.execute(query, {"model_id": model_id})
        row = result.fetchone()

        multimedia_count = row[0] if row else 0

        return {
            "model_id": model_id,
            "has_multimedia": multimedia_count > 0,
            "multimedia_count": multimedia_count
        }

    except Exception as e:
        print(f"Error checking multimedia for model {model_id}: {str(e)}")
        return {
            "model_id": model_id,
            "has_multimedia": False,
            "multimedia_count": 0
        }

